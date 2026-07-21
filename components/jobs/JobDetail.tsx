"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { Job, Candidate, PayType, JobStatus } from "@/lib/types";
import { JOB_STATUS_TONE, STAGE_LABEL } from "@/lib/types";
import { updateJob } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Edit, Users, Book } from "@/components/icons";
import { parseJobTitle } from "@/lib/job-title";

/** Shared by the Jobs tab and the Hot Openings tab so both behave identically. */

/** Small pill showing how many openings a role has (only when > 1). */
export function Openings({ n }: { n: number }) {
  if (n <= 1) return null;
  return <Badge tone="info">×{n} openings</Badge>;
}

export function payLabel(j: Job): string {
  const salary = j.pay_type === "salary";
  const fmt = (n: number) => (salary ? `$${Math.round(n / 1000)}k` : `$${n}`);
  const { pay_min: min, pay_max: max } = j;
  if (min != null && max != null) {
    if (min === max) return `${fmt(min)}${salary ? "/yr" : "/hr"}`;
    return salary ? `${fmt(min)}–${fmt(max)}/yr` : `$${min}–${max}/hr`;
  }
  if (j.pay_amount != null) return salary ? `$${j.pay_amount.toLocaleString()}/yr` : `$${j.pay_amount}/hr`;
  return "Pay TBD";
}

export function DetailSection({ label, body, empty }: { label: string; body?: string | null; empty?: string }) {
  if (!body && !empty) return null;
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</h4>
      {body ? (
        <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
      ) : (
        <p className="mt-1.5 text-[13px] text-muted">{empty}</p>
      )}
    </div>
  );
}

/**
 * The note shown under a role in the list, editable in place. Click the note
 * (or "Add note") to turn it into a textarea; Ctrl/Cmd+Enter saves, Esc cancels.
 * Used on both Job Openings and Hot Openings.
 */
export function InlineNotes({ job }: { job: Job }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(job.notes ?? "");
  const [value, setValue] = useState(job.notes ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  function save() {
    const next = value.trim();
    start(async () => {
      await updateJob(job.id, { notes: next });
      setSaved(next);
      setEditing(false);
      toast(next ? "Note saved" : "Note cleared");
    });
  }

  if (editing) {
    return (
      <div className="mt-1.5">
        <Textarea
          rows={2}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          placeholder="Req ID, address, state min wage, shift differential, anything to remember…"
          className="text-[12px]"
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save note"}
          </Button>
          <Button size="sm" variant="secondary" onClick={cancel}>Cancel</Button>
          <span className="text-[11px] text-faint">Ctrl/⌘ + Enter to save · Esc to cancel</span>
        </div>
      </div>
    );
  }

  if (!saved) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-1 inline-flex items-center gap-1.5 rounded-[5px] text-[11.5px] text-faint transition-colors hover:text-accent"
      >
        <Book width={12} height={12} /> Add note
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit this note"
      className="mt-1 flex w-full items-start gap-1.5 rounded-[5px] text-left text-[11.5px] leading-snug text-muted transition-colors hover:text-ink"
    >
      <Book width={12} height={12} className="mt-[2px] shrink-0 text-faint" />
      <span className="line-clamp-2">{saved}</span>
    </button>
  );
}

/** Every editable field of a req. Shared by the popup's edit mode and the Add form. */
export function JobFields({
  form, set,
}: {
  form: Partial<Job>;
  set: (patch: Partial<Job>) => void;
}) {
  const salary = form.pay_type === "salary";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client"><Input value={form.client_name ?? ""} onChange={(e) => set({ client_name: e.target.value })} placeholder="Bombardier" /></Field>
      <Field label="Position"><Input value={form.position_title ?? ""} onChange={(e) => set({ position_title: e.target.value })} placeholder="A&P Mechanic" /></Field>
      <Field label="Location"><Input value={form.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder="Wichita, KS" /></Field>
      <Field label="Pay type">
        <Select value={form.pay_type} onChange={(e) => set({ pay_type: e.target.value as PayType })}>
          <option value="hourly">Hourly</option><option value="salary">Salary</option>
        </Select>
      </Field>
      <Field label={salary ? "Salary min ($)" : "Rate min ($/hr)"}>
        <Input type="number" value={form.pay_min ?? ""} onChange={(e) => set({ pay_min: e.target.value === "" ? null : Number(e.target.value) })} placeholder={salary ? "120000" : "30"} />
      </Field>
      <Field label={salary ? "Salary max ($)" : "Rate max ($/hr)"}>
        <Input type="number" value={form.pay_max ?? ""} onChange={(e) => set({ pay_max: e.target.value === "" ? null : Number(e.target.value) })} placeholder={salary ? "140000" : "40"} />
      </Field>
      <Field label="Hire type">
        <Select value={form.job_type ?? ""} onChange={(e) => set({ job_type: e.target.value })}>
          <option>Contract</option><option>Contract-to-Hire</option><option>Direct Hire</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => set({ status: e.target.value as JobStatus })}>
          <option>Open</option><option>Filled</option><option>On Hold</option>
        </Select>
      </Field>
      <Field label="Full job description (shown in the popup)" className="sm:col-span-2">
        <Textarea rows={8} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Paste the client's full JD: overview, what you will do, preferred quals, clearance…" />
      </Field>
      <Field label="Must-have qualifications (2-line preview in the table)" className="sm:col-span-2">
        <Textarea rows={2} value={form.requirements ?? ""} onChange={(e) => set({ requirements: e.target.value })} placeholder="Experience, tools, licenses, aircraft types…" />
      </Field>
      <Field label="Client note (shown on the group)" className="sm:col-span-2">
        <Input value={form.client_note ?? ""} onChange={(e) => set({ client_note: e.target.value })} placeholder="Direct hiring only · per diem · US citizenship required" />
      </Field>
      <Field label="Notes (shown under the role in the list)" className="sm:col-span-2">
        <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Req ID, address, state min wage, shift differential, anything to remember…" />
      </Field>
    </div>
  );
}

/**
 * Full job description popup. Opens read-only; the Edit button flips the same
 * modal into a form covering every field, so a req can be edited from wherever
 * it was opened (Job Openings or Hot Openings).
 */
export function JobDetail({
  job, candidates, onClose,
}: {
  job: Job;
  candidates: Candidate[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Job>>(job);
  const [pending, start] = useTransition();
  const toast = useToast();
  const set = (patch: Partial<Job>) => setForm((f) => ({ ...f, ...patch }));

  function save() {
    start(async () => {
      await updateJob(job.id, form);
      toast("Opening updated");
      setEditing(false);
    });
  }

  const { title, openings } = parseJobTitle(editing ? (form.position_title ?? "") : job.position_title);

  if (editing) {
    return (
      <Modal
        open
        onClose={() => setEditing(false)}
        size="lg"
        title="Edit Opening"
        subtitle={`${form.client_name || job.client_name}${form.location ? ` · ${form.location}` : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setForm(job); setEditing(false); }}>Cancel</Button>
            <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        <JobFields form={form} set={set} />
      </Modal>
    );
  }


  // Show freshly saved values immediately, before the server round-trip lands.
  const view = { ...job, ...form } as Job;

  const facts: [string, ReactNode][] = [
    ["Client", view.client_name],
    ["Location", view.location || "—"],
    ["Pay", <span key="p" className="font-display font-bold text-accent">{payLabel(view)}</span>],
    ["Hire type", view.job_type || "—"],
    ["Status", <Badge key="s" tone={JOB_STATUS_TONE[view.status]}>{view.status}</Badge>],
    ["Openings", openings > 1 ? `${openings} seats` : "1 seat"],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {title}
          <Openings n={openings} />
        </span>
      }
      subtitle={`${view.client_name}${view.location ? ` · ${view.location}` : ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => setEditing(true)}><Edit width={16} height={16} /> Edit</Button>
        </>
      }
    >
      {/* Fact grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</dt>
            <dd className="mt-1 flex items-center text-[13.5px] text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <DetailSection label="Full job description" body={view.description} empty="No full JD on file yet. Click Edit to add one." />
      <DetailSection label="Must-have qualifications" body={view.requirements} />
      <DetailSection label="Client note" body={view.client_note} />
      <DetailSection label="Notes" body={view.notes} />

      {/* Candidates in play */}
      <div className="mt-6 border-t border-line pt-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-faint">
          Candidates on this req
        </h4>
        {candidates.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-muted">Nobody submitted to this opening yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2.5 py-1.5">
                <Users width={13} height={13} className="text-faint" />
                <span className="text-[13px] font-medium text-ink">{c.name}</span>
                <Badge tone="neutral">{STAGE_LABEL[c.stage]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Flame toggle — adds/removes a job from the Hot Openings list. */
export function HotToggle({
  hot, onToggle, pending,
}: {
  hot: boolean;
  onToggle: () => void;
  pending?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={pending}
      aria-pressed={hot}
      title={hot ? "Remove from Hot Openings" : "Add to Hot Openings"}
      aria-label={hot ? "Remove from Hot Openings" : "Add to Hot Openings"}
      className={
        "grid h-7 w-7 place-items-center rounded-[7px] transition-colors disabled:opacity-50 " +
        (hot
          ? "bg-warn-soft text-warn hover:bg-warn-soft/70"
          : "text-faint hover:bg-warn-soft hover:text-warn")
      }
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={hot ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    </button>
  );
}
