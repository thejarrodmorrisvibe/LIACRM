"use client";

import { useMemo, useState, useTransition } from "react";
import type { Interview, Candidate, InterviewType, InterviewStatus } from "@/lib/types";
import { INTERVIEW_TYPE_TONE, INTERVIEW_STATUS_TONE } from "@/lib/types";
import { createInterview, updateInterview, deleteInterview } from "@/lib/actions/interviews";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { CalendarClock, Calendar, Phone, Video, MapPin, Plus, Trash, Edit, CheckSquare, Clock } from "@/components/icons";

const TYPE_ICON: Record<InterviewType, typeof Phone> = { Phone, Video, "In-person": MapPin };
const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    ms: d.getTime(),
  };
}
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EMPTY: Partial<Interview> = {
  candidate_id: null, candidate_name: "", client_name: "", position: "",
  interview_type: "Phone", scheduled_at: null, location: "", status: "Scheduled", notes: "",
};

export function InterviewsClient({ interviews, candidates }: { interviews: Interview[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Interview> | null>(null);

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7);

  const isUpcoming = (i: Interview) =>
    i.status === "Scheduled" && i.scheduled_at != null && new Date(i.scheduled_at).getTime() >= startOfToday.getTime();

  const upcoming = useMemo(
    () => interviews.filter(isUpcoming).sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")),
    [interviews],
  );
  const past = useMemo(
    () => interviews.filter((i) => !isUpcoming(i)).sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? "")),
    [interviews],
  );

  const todayCount = upcoming.filter((i) => { const d = new Date(i.scheduled_at!); return d.toDateString() === new Date().toDateString(); }).length;
  const weekCount = upcoming.filter((i) => new Date(i.scheduled_at!).getTime() <= endOfWeek.getTime()).length;
  const completedCount = interviews.filter((i) => i.status === "Completed").length;

  function save(form: Partial<Interview>) {
    const isNew = !form.id;
    start(async () => {
      if (isNew) await createInterview(form);
      else await updateInterview(form.id!, form);
      toast(isNew ? "Interview scheduled" : "Interview updated");
      setEditing(null);
    });
  }
  function remove(i: Interview) {
    if (!confirm(`Delete the interview for ${i.candidate_name}?`)) return;
    start(async () => { await deleteInterview(i.id); toast("Interview removed", "info"); });
  }
  function markDone(i: Interview) {
    start(() => updateInterview(i.id, { status: "Completed" }));
  }

  return (
    <PageShell>
      <PageHeader
        title="Interviews"
        subtitle="Track phone, video, and in-person interviews your clients schedule."
        action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus width={17} height={17} /> Schedule Interview</Button>}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming" value={upcoming.length} accent="blue" icon={<CalendarClock width={17} height={17} />} sub="scheduled ahead" />
        <StatCard label="Today" value={todayCount} accent="amber" icon={<Clock width={17} height={17} />} sub="on the calendar" />
        <StatCard label="This Week" value={weekCount} accent="cyan" icon={<Calendar width={17} height={17} />} sub="next 7 days" />
        <StatCard label="Completed" value={completedCount} accent="emerald" icon={<CheckSquare width={17} height={17} />} sub="all time" />
      </div>

      {/* Upcoming */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-[15px] font-bold text-ink">Upcoming Interviews</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent"><CalendarClock width={22} height={22} /></span>
            <p className="mt-3 font-display font-bold text-ink">No interviews scheduled</p>
            <p className="mt-1 mx-auto max-w-sm text-[13.5px] text-muted">When a client books a phone or in-person interview, schedule it here to keep track.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((i) => <Row key={i.id} i={i} onEdit={() => setEditing(i)} onDelete={() => remove(i)} onDone={() => markDone(i)} pending={pending} />)}
          </ul>
        )}
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-display text-[15px] font-bold text-ink">Past & Completed</h3>
          </div>
          <ul className="divide-y divide-line">
            {past.map((i) => <Row key={i.id} i={i} onEdit={() => setEditing(i)} onDelete={() => remove(i)} pending={pending} muted />)}
          </ul>
        </Card>
      )}

      {editing && (
        <InterviewForm initial={editing} candidates={candidates} pending={pending} onClose={() => setEditing(null)} onSave={save} />
      )}
    </PageShell>
  );
}

function Row({
  i, onEdit, onDelete, onDone, pending, muted = false,
}: {
  i: Interview;
  onEdit: () => void;
  onDelete: () => void;
  onDone?: () => void;
  pending: boolean;
  muted?: boolean;
}) {
  const dt = fmtDateTime(i.scheduled_at);
  const TypeIcon = TYPE_ICON[i.interview_type];
  return (
    <li className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
      {/* When */}
      <div className="w-[92px] shrink-0 text-center">
        {dt ? (
          <>
            <div className={`text-[12.5px] font-bold ${muted ? "text-muted" : "text-ink"}`}>{dt.date}</div>
            <div className="text-[12px] text-muted nums">{dt.time}</div>
          </>
        ) : <div className="text-[12px] text-faint">No time set</div>}
      </div>
      <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent sm:grid">{initials(i.candidate_name)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{i.candidate_name}</div>
        <div className="truncate text-[12.5px] text-muted">{[i.position, i.client_name].filter(Boolean).join(" · ")}</div>
        {i.location && <div className="truncate text-[12px] text-faint">{i.location}</div>}
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <Badge tone={INTERVIEW_TYPE_TONE[i.interview_type]}><TypeIcon width={11} height={11} /> {i.interview_type}</Badge>
        {i.status !== "Scheduled" && <Badge tone={INTERVIEW_STATUS_TONE[i.status]}>{i.status}</Badge>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        {onDone && (
          <button onClick={onDone} disabled={pending} title="Mark completed" aria-label="Mark completed" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-ok-soft hover:text-ok">
            <CheckSquare width={16} height={16} />
          </button>
        )}
        <button onClick={onEdit} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-accent-soft hover:text-accent"><Edit width={15} height={15} /></button>
        <button onClick={onDelete} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-bad-soft hover:text-bad"><Trash width={15} height={15} /></button>
      </div>
    </li>
  );
}

function InterviewForm({
  initial, candidates, onClose, onSave, pending,
}: {
  initial: Partial<Interview>;
  candidates: Candidate[];
  onClose: () => void;
  onSave: (f: Partial<Interview>) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<Interview>>(initial);
  const set = (patch: Partial<Interview>) => setForm((f) => ({ ...f, ...patch }));
  const isNew = !initial.id;

  function pickCandidate(id: string) {
    if (!id) { set({ candidate_id: null }); return; }
    const c = candidates.find((x) => x.id === id);
    if (c) set({ candidate_id: c.id, candidate_name: c.name, client_name: c.client_company ?? "", position: c.role ?? "" });
  }

  const isInPerson = form.interview_type === "In-person";
  const locLabel = isInPerson ? "Address" : form.interview_type === "Video" ? "Meeting link" : "Phone number";

  return (
    <Modal
      open onClose={onClose}
      title={isNew ? "Schedule Interview" : "Edit Interview"}
      subtitle="Record an interview a client has scheduled."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={pending || !form.candidate_name?.trim()}>
            {pending ? "Saving…" : isNew ? "Schedule" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pick candidate" className="sm:col-span-2">
          <Select value={form.candidate_id ?? ""} onChange={(e) => pickCandidate(e.target.value)}>
            <option value="">Type a name below</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Candidate name">
          <Input value={form.candidate_name ?? ""} onChange={(e) => set({ candidate_name: e.target.value, candidate_id: null })} placeholder="Jane Doe" />
        </Field>
        <Field label="Position">
          <Input value={form.position ?? ""} onChange={(e) => set({ position: e.target.value })} placeholder="Avionics Engineer" />
        </Field>
        <Field label="Client / company">
          <Input value={form.client_name ?? ""} onChange={(e) => set({ client_name: e.target.value })} placeholder="Boeing" />
        </Field>
        <Field label="Date & time">
          <Input type="datetime-local" value={toLocalInput(form.scheduled_at ?? null)} onChange={(e) => set({ scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </Field>
        <Field label="Type">
          <Select value={form.interview_type} onChange={(e) => set({ interview_type: e.target.value as InterviewType })}>
            <option>Phone</option><option>Video</option><option>In-person</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set({ status: e.target.value as InterviewStatus })}>
            <option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>No-show</option>
          </Select>
        </Field>
        <Field label={locLabel} className="sm:col-span-2">
          <Input value={form.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder={isInPerson ? "201 Aero Way, Fort Worth, TX" : form.interview_type === "Video" ? "Zoom / Teams link" : "(555) 123-4567"} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Who they're meeting, what to prep, anything to remember…" />
        </Field>
      </div>
    </Modal>
  );
}
