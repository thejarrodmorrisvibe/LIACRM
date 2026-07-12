"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import type { Job, Candidate, PayType, JobStatus } from "@/lib/types";
import { JOB_STATUS_TONE, STAGE_LABEL } from "@/lib/types";
import { createJob, updateJob, deleteJob } from "@/lib/actions/jobs";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Plus, MapPin, Briefcase, Trash, Edit, Users, Search } from "@/components/icons";
import { parseJobTitle } from "@/lib/job-title";
import { statesOf } from "@/lib/us-states";
import { cn } from "@/lib/utils";

/** Small pill showing how many openings a role has (only when > 1). */
function Openings({ n }: { n: number }) {
  if (n <= 1) return null;
  return <Badge tone="info">×{n} openings</Badge>;
}

function payLabel(j: Job): string {
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

const EMPTY: Partial<Job> = {
  client_name: "", position_title: "", pay_type: "hourly", pay_min: null, pay_max: null,
  location: "", job_type: "Contract", status: "Open", is_hot: false,
  description: "", requirements: "", client_note: "", notes: "",
};

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", open ? "rotate-90" : "")}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export function JobsClient({ jobs, candidates }: { jobs: Job[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Job> | null>(null);
  const [viewing, setViewing] = useState<Job | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const candCount = (jobId: string) => candidates.filter((c) => c.job_id === jobId).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.client_name, j.position_title, j.location, j.requirements, j.client_note]
        .filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [jobs, query]);

  // Group by state, then by client within each state. A multi-site opening
  // (location naming two states) shows under each of its states.
  const stateGroups = useMemo(() => {
    const byState = new Map<string, Map<string, Job[]>>();
    const add = (state: string, j: Job) => {
      if (!byState.has(state)) byState.set(state, new Map());
      const cm = byState.get(state)!;
      if (!cm.has(j.client_name)) cm.set(j.client_name, []);
      cm.get(j.client_name)!.push(j);
    };
    for (const j of filtered) {
      const sts = statesOf(j.location);
      if (sts.length === 0) add("Other / Unspecified", j);
      else for (const s of sts) add(s.name, j);
    }
    return [...byState.entries()]
      .map(([state, cm]) => ({
        state,
        clients: [...cm.entries()].sort((a, b) => a[0].localeCompare(b[0])),
        openings: [...cm.values()].reduce((n, l) => n + l.length, 0),
        clientCount: cm.size,
      }))
      .sort((a, b) =>
        (a.state === "Other / Unspecified" ? 1 : 0) - (b.state === "Other / Unspecified" ? 1 : 0) ||
        a.state.localeCompare(b.state),
      );
  }, [filtered]);

  const openCount = jobs.filter((j) => j.status === "Open").length;
  const clientCount = new Set(jobs.map((j) => j.client_name)).size;

  function save(form: Partial<Job>) {
    const isNew = !form.id;
    start(async () => {
      if (isNew) await createJob(form);
      else await updateJob(form.id!, form);
      toast(isNew ? "Opening added" : "Opening updated");
      setEditing(null);
    });
  }
  function remove(j: Job) {
    if (!confirm(`Delete "${j.position_title}" at ${j.client_name}?`)) return;
    start(async () => { await deleteJob(j.id); toast("Opening deleted", "info"); });
  }
  function toggleClient(name: string) {
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Job Openings"
        subtitle={`${openCount} open positions · ${clientCount} clients`}
        action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus width={17} height={17} /> Add Opening</Button>}
      />

      {/* Search */}
      <div className="relative mt-5">
        <Search width={17} height={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search position, client, location, requirement…" className="pl-9" />
      </div>

      {/* State → Client tables */}
      {stateGroups.length === 0 ? (
        <Card className="mt-5 px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent"><Briefcase width={22} height={22} /></span>
          <p className="mt-3 font-display font-bold text-ink">No openings match</p>
          <p className="mt-1 text-[13.5px] text-muted">Try a different search, or add an opening.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-7">
          {stateGroups.map((sg) => (
            <div key={sg.state}>
              {/* State header */}
              <div className="mb-3 flex items-center gap-2 border-b border-line-strong pb-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-accent-soft text-accent"><MapPin width={15} height={15} /></span>
                <h2 className="font-display text-[18px] font-extrabold text-ink">{sg.state}</h2>
                <span className="text-[12.5px] text-muted">
                  {sg.openings} {sg.openings === 1 ? "role" : "roles"} · {sg.clientCount} {sg.clientCount === 1 ? "client" : "clients"}
                </span>
              </div>

              <div className="space-y-4">
                {sg.clients.map(([client, list]) => {
                  const collapseKey = `${sg.state}|${client}`;
                  const isCollapsed = collapsed.has(collapseKey);
                  const note = list.find((j) => j.client_note)?.client_note;
                  return (
                    <Card key={collapseKey} className="overflow-hidden">
                      <button onClick={() => toggleClient(collapseKey)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2">
                  <span className="text-muted"><Chevron open={!isCollapsed} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[16px] font-bold text-ink">{client}</h3>
                    </div>
                    {note && <p className="mt-0.5 truncate text-[12.5px] text-muted">{note}</p>}
                  </div>
                  <Badge tone="accent">{list.length} {list.length === 1 ? "role" : "roles"}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-line">
                    {/* Column header (desktop) */}
                    <div className="hidden grid-cols-[1fr_160px_110px_130px_64px] gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid">
                      <span>Position</span><span>Location</span><span className="text-right">Pay</span><span>Hire type</span><span />
                    </div>
                    <ul className="divide-y divide-line">
                      {list.map((j) => {
                        const n = candCount(j.id);
                        return (
                          <li key={j.id} className="grid grid-cols-1 gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[1fr_160px_110px_130px_64px] sm:items-center">
                            {/* Position + requirements */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewing(j)}
                                  title="View full job description"
                                  className="truncate rounded-[4px] text-left text-[14px] font-semibold text-ink underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                  {parseJobTitle(j.position_title).title}
                                </button>
                                <Openings n={parseJobTitle(j.position_title).openings} />
                              </div>
                              {j.requirements && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-soft">{j.requirements}</p>}
                            </div>
                            {/* Location */}
                            <div className="flex items-center gap-1 text-[12.5px] text-muted">
                              {j.location && <><MapPin width={13} height={13} className="shrink-0 text-faint" /> <span className="truncate">{j.location}</span></>}
                            </div>
                            {/* Pay */}
                            <div className="font-display text-[14px] font-bold text-accent sm:text-right whitespace-nowrap">{payLabel(j)}</div>
                            {/* Hire type */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {j.job_type && <Badge tone={/direct/i.test(j.job_type) ? "info" : "neutral"}>{j.job_type}</Badge>}
                              {j.status !== "Open" && <Badge tone={JOB_STATUS_TONE[j.status]}>{j.status}</Badge>}
                              {n > 0 && <Badge tone="accent"><Users width={11} height={11} /> {n}</Badge>}
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-0.5 sm:justify-end">
                              <button onClick={() => setEditing(j)} className="grid h-7 w-7 place-items-center rounded-[7px] text-muted hover:bg-accent-soft hover:text-accent" aria-label="Edit"><Edit width={15} height={15} /></button>
                              <button onClick={() => remove(j)} className="grid h-7 w-7 place-items-center rounded-[7px] text-muted hover:bg-bad-soft hover:text-bad" aria-label="Delete"><Trash width={15} height={15} /></button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <JobDetail
          job={viewing}
          candidates={candidates.filter((c) => c.job_id === viewing.id)}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}

      {editing && (
        <JobForm initial={editing} pending={pending} onClose={() => setEditing(null)} onSave={save} />
      )}
    </PageShell>
  );
}

/** Read-only full job description, opened by clicking a position title. */
function JobDetail({
  job, candidates, onClose, onEdit,
}: {
  job: Job;
  candidates: Candidate[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const { title, openings } = parseJobTitle(job.position_title);

  const facts: [string, ReactNode][] = [
    ["Client", job.client_name],
    ["Location", job.location || "—"],
    ["Pay", <span key="p" className="font-display font-bold text-accent">{payLabel(job)}</span>],
    ["Hire type", job.job_type || "—"],
    ["Status", <Badge key="s" tone={JOB_STATUS_TONE[job.status]}>{job.status}</Badge>],
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
      subtitle={`${job.client_name}${job.location ? ` · ${job.location}` : ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={onEdit}><Edit width={16} height={16} /> Edit</Button>
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

      <DetailSection label="Full job description" body={job.description} empty="No full JD on file yet. Click Edit to add one." />
      <DetailSection label="Must-have qualifications" body={job.requirements} />
      <DetailSection label="Client note" body={job.client_note} />
      <DetailSection label="Internal notes" body={job.notes} />

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

function DetailSection({ label, body, empty }: { label: string; body?: string | null; empty?: string }) {
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

function JobForm({
  initial, onClose, onSave, pending,
}: {
  initial: Partial<Job>;
  onClose: () => void;
  onSave: (j: Partial<Job>) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<Job>>(initial);
  const set = (patch: Partial<Job>) => setForm((f) => ({ ...f, ...patch }));
  const isNew = !initial.id;
  const salary = form.pay_type === "salary";

  return (
    <Modal
      open onClose={onClose}
      title={isNew ? "Add Opening" : "Edit Opening"}
      subtitle="Track an open req for your client roster."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={pending}>{pending ? "Saving…" : isNew ? "Add" : "Save"}</Button>
        </>
      }
    >
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
          <Textarea rows={6} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Paste the client's full JD: overview, what you will do, preferred quals, clearance…" />
        </Field>
        <Field label="Must-have qualifications (2-line preview in the table)" className="sm:col-span-2">
          <Textarea rows={2} value={form.requirements ?? ""} onChange={(e) => set({ requirements: e.target.value })} placeholder="Experience, tools, licenses, aircraft types…" />
        </Field>
        <Field label="Client note (shown on the group)" className="sm:col-span-2">
          <Input value={form.client_note ?? ""} onChange={(e) => set({ client_note: e.target.value })} placeholder="Direct hiring only · per diem · US citizenship required" />
        </Field>
        <Field label="Internal notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Taxes, shift differential, anything to remember…" />
        </Field>
      </div>
    </Modal>
  );
}
