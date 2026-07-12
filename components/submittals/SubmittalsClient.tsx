"use client";

import { useMemo, useState, useTransition } from "react";
import type { Submittal, Candidate, Stage } from "@/lib/types";
import { STAGES, STAGE_META, STAGE_LABEL } from "@/lib/types";
import { submittalCounts, weekStartYmd } from "@/lib/submittals";
import { createSubmittal, deleteSubmittal, setSubmittalStage } from "@/lib/actions/submittals";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Send, Plus, Trash, Calendar, Sparkles } from "@/components/icons";
import { prettyDate } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

/** Display a stored rate: bare numbers become "$X/hr"; keep ranges/text as-is. */
function fmtRate(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return `$${s}/hr`;
  return s.replace(/\s*\/?\s*hr\b/i, "/hr");
}

export type Period = "today" | "week" | "month" | "all";
const PERIOD_LABEL: Record<Period, string> = {
  today: "Today", week: "This Week", month: "This Month", all: "All",
};

export function SubmittalsClient({
  submittals,
  candidates,
  initialPeriod = "all",
}: {
  submittals: Submittal[];
  candidates: Candidate[];
  initialPeriod?: Period;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [logging, setLogging] = useState(false);
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const counts = useMemo(() => submittalCounts(submittals), [submittals]);

  // Resolve each submittal's pipeline stage via its linked candidate (by id, else name).
  const { byId, byName } = useMemo(() => {
    const byId = new Map<string, Candidate>();
    const byName = new Map<string, Candidate>();
    for (const c of candidates) {
      byId.set(c.id, c);
      byName.set(c.name.trim().toLowerCase(), c);
    }
    return { byId, byName };
  }, [candidates]);
  const nameKey = (s: Submittal) => s.candidate_name.trim().toLowerCase();
  const resolvedStage = (s: Submittal): Stage | "" =>
    (s.candidate_id && byId.get(s.candidate_id)?.stage) || byName.get(nameKey(s))?.stage || "";

  // Optimistic overrides keyed by candidate name so all rows for a person update together.
  const [stageOverride, setStageOverride] = useState<Record<string, Stage>>({});
  const stageOf = (s: Submittal): Stage | "" => stageOverride[nameKey(s)] ?? resolvedStage(s);

  function changeStage(s: Submittal, stage: Stage) {
    setStageOverride((o) => ({ ...o, [nameKey(s)]: stage }));
    start(async () => {
      await setSubmittalStage(s.id, stage);
      toast(`${s.candidate_name} → ${stage}`);
    });
  }

  const t = today();
  const weekStart = weekStartYmd();
  const monthPrefix = t.slice(0, 7);
  const shown = useMemo(() => {
    if (period === "today") return submittals.filter((s) => s.submitted_at === t);
    if (period === "week") return submittals.filter((s) => s.submitted_at >= weekStart && s.submitted_at <= t);
    if (period === "month") return submittals.filter((s) => s.submitted_at.startsWith(monthPrefix));
    return submittals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittals, period]);

  const select = (p: Period) => setPeriod((cur) => (cur === p ? "all" : p));

  function remove(s: Submittal) {
    if (!confirm(`Remove the submittal for ${s.candidate_name}?`)) return;
    start(async () => {
      await deleteSubmittal(s.id);
      toast("Submittal removed", "info");
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Master Submittals"
        subtitle="Every candidate you've submitted, with a running scoreboard."
        action={
          <Button onClick={() => setLogging(true)}>
            <Plus width={17} height={17} /> Log Submittal
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={counts.today} accent="blue" icon={<Send width={17} height={17} />} sub="click to view" onClick={() => select("today")} active={period === "today"} />
        <StatCard label="This Week" value={counts.week} accent="cyan" icon={<Calendar width={17} height={17} />} sub="click to view" onClick={() => select("week")} active={period === "week"} />
        <StatCard label="This Month" value={counts.month} accent="violet" icon={<Calendar width={17} height={17} />} sub="click to view" onClick={() => select("month")} active={period === "month"} />
        <StatCard label="All Time" value={counts.all} accent="emerald" icon={<Sparkles width={17} height={17} />} sub="click to view" onClick={() => select("all")} active={period === "all"} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-bold text-ink">
              {period === "all" ? "Submittal Log" : `Submittals · ${PERIOD_LABEL[period]}`}
            </h3>
            <span className="text-[12.5px] text-muted">{shown.length}</span>
          </div>
          {period !== "all" && (
            <button onClick={() => setPeriod("all")} className="text-[12.5px] font-semibold text-accent hover:underline">
              Show all
            </button>
          )}
        </div>

        {submittals.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Send width={22} height={22} />
            </span>
            <p className="mt-3 font-display font-bold text-ink">No submittals logged yet</p>
            <p className="mt-1 mx-auto max-w-sm text-[13.5px] text-muted">
              Log one with the button above, or just move a candidate into the{" "}
              <strong>Submitted</strong> stage in your pipeline and it lands here automatically.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-display font-bold text-ink">Nothing for {PERIOD_LABEL[period].toLowerCase()}</p>
            <p className="mt-1 text-[13.5px] text-muted">No submittals in this window yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((s) => (
              <li key={s.id} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
                <Avatar name={s.candidate_name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{s.candidate_name}</div>
                  <div className="truncate text-[12.5px] text-muted">
                    {[s.position, s.client_name, s.location].filter(Boolean).join(" · ") || "No details"}
                  </div>
                </div>
                {fmtRate(s.pay_rate) && (
                  <span className="hidden shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] font-bold text-accent whitespace-nowrap sm:inline">
                    {fmtRate(s.pay_rate)}
                  </span>
                )}
                <StageSelect value={stageOf(s)} disabled={pending} onChange={(st) => changeStage(s, st)} />
                <div className="hidden shrink-0 items-center gap-1.5 text-[12.5px] text-ink-soft nums sm:flex">
                  <Calendar width={13} height={13} className="text-faint" /> {prettyDate(s.submitted_at)}
                </div>
                <button
                  onClick={() => remove(s)}
                  className="grid h-8 w-8 place-items-center rounded-[8px] text-faint opacity-0 transition hover:bg-bad-soft hover:text-bad group-hover:opacity-100"
                  aria-label="Remove submittal"
                >
                  <Trash width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {logging && (
        <LogSubmittalForm
          candidates={candidates}
          pending={pending}
          onClose={() => setLogging(false)}
          onSave={(form) =>
            start(async () => {
              await createSubmittal(form);
              toast("Submittal logged");
              setLogging(false);
            })
          }
        />
      )}
    </PageShell>
  );
}

function StageSelect({ value, onChange, disabled }: { value: Stage | ""; onChange: (s: Stage) => void; disabled?: boolean }) {
  const dot = value ? STAGE_META[value].dot : "var(--color-line-strong)";
  return (
    <div className="relative shrink-0">
      <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: dot }} />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value as Stage)}
        aria-label="Pipeline stage"
        title="Assign pipeline stage"
        className="h-8 w-[130px] cursor-pointer appearance-none rounded-full border border-line-strong bg-surface pl-6 pr-6 text-[12px] font-semibold text-ink transition hover:border-accent focus:border-accent focus:outline-none disabled:opacity-60"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%236b7a92' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4 6 8 10 12 6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        <option value="" disabled>Set stage…</option>
        {STAGES.map((st) => (
          <option key={st} value={st}>{STAGE_LABEL[st]}</option>
        ))}
      </select>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent">
      {initials || "?"}
    </span>
  );
}

function LogSubmittalForm({
  candidates,
  onClose,
  onSave,
  pending,
}: {
  candidates: Candidate[];
  onClose: () => void;
  onSave: (form: Partial<Submittal>) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<Submittal>>({
    candidate_id: null,
    candidate_name: "",
    client_name: "",
    position: "",
    pay_rate: "",
    location: "",
    submitted_at: today(),
    notes: "",
  });
  const set = (patch: Partial<Submittal>) => setForm((f) => ({ ...f, ...patch }));

  function pickCandidate(id: string) {
    if (!id) {
      set({ candidate_id: null });
      return;
    }
    const c = candidates.find((x) => x.id === id);
    if (c) {
      set({
        candidate_id: c.id,
        candidate_name: c.name,
        client_name: c.client_company ?? "",
        position: c.role ?? "",
        pay_rate: c.pay_rate != null ? String(c.pay_rate) : "",
      });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Log a Submittal"
      subtitle="Record a candidate you submitted. Pick one from your pipeline or type a name."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={pending || !form.candidate_name?.trim()}>
            {pending ? "Logging…" : "Log Submittal"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pick from pipeline" className="sm:col-span-2">
          <Select value={form.candidate_id ?? ""} onChange={(e) => pickCandidate(e.target.value)}>
            <option value="">Type a new name below</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.client_company ? ` · ${c.client_company}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Candidate name">
          <Input value={form.candidate_name ?? ""} onChange={(e) => set({ candidate_name: e.target.value, candidate_id: null })} placeholder="Jane Doe" />
        </Field>
        <Field label="Date submitted">
          <Input type="date" value={form.submitted_at ?? today()} onChange={(e) => set({ submitted_at: e.target.value })} />
        </Field>
        <Field label="Rate submitted at">
          <Input value={form.pay_rate ?? ""} onChange={(e) => set({ pay_rate: e.target.value })} placeholder="$45/hr" />
        </Field>
        <Field label="Position">
          <Input value={form.position ?? ""} onChange={(e) => set({ position: e.target.value })} placeholder="Avionics Engineer" />
        </Field>
        <Field label="Client / company">
          <Input value={form.client_name ?? ""} onChange={(e) => set({ client_name: e.target.value })} placeholder="Boeing" />
        </Field>
        <Field label="Location">
          <Input value={form.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder="Jacksonville, FL" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything to remember about this submission…" />
        </Field>
      </div>
    </Modal>
  );
}
