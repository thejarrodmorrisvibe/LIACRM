"use client";

import { useMemo, useState, useTransition } from "react";
import type { Job, Candidate } from "@/lib/types";
import { JOB_STATUS_TONE } from "@/lib/types";
import { createJob, updateJob, deleteJob, toggleHot } from "@/lib/actions/jobs";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Plus, MapPin, Briefcase, Trash, Edit, Users, Search } from "@/components/icons";
import { cleanJobTitle, jobOpenings } from "@/lib/job-title";
import { statesOf, OTHER_STATE, locationInState } from "@/lib/us-states";
import { cn } from "@/lib/utils";
import { JobDetail, JobFields, InlineNotes, Openings, payLabel, HotToggle } from "@/components/jobs/JobDetail";

const EMPTY: Partial<Job> = {
  client_name: "", position_title: "", pay_type: "hourly", pay_min: null, pay_max: null,
  location: "", job_type: "Contract", status: "Open", is_hot: false,
  description: "", requirements: "", client_note: "", notes: "", openings: 1,
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
  const [stateFilter, setStateFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const candCount = (jobId: string) => candidates.filter((c) => c.job_id === jobId).length;

  /** Every state that currently has reqs, with a count. Multi-site reqs count in each. */
  const stateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs) {
      const sts = statesOf(j.location);
      if (sts.length === 0) counts.set(OTHER_STATE, (counts.get(OTHER_STATE) ?? 0) + 1);
      else for (const s of sts) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => (a[0] === OTHER_STATE ? 1 : 0) - (b[0] === OTHER_STATE ? 1 : 0) || a[0].localeCompare(b[0]),
    );
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (stateFilter && !locationInState(j.location, stateFilter)) return false;
      if (!q) return true;
      return [j.client_name, j.position_title, j.location, j.requirements, j.client_note, j.notes, j.description]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [jobs, query, stateFilter]);

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
      if (sts.length === 0) add(OTHER_STATE, j);
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
        (a.state === OTHER_STATE ? 1 : 0) - (b.state === OTHER_STATE ? 1 : 0) ||
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
  /** Add/remove this req from the Hot Openings list. */
  function hot(j: Job) {
    start(async () => {
      await toggleHot(j.id, !j.is_hot);
      toast(j.is_hot ? `Removed from Hot Openings` : `Added to Hot Openings`);
    });
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

      {/* Search + state filter */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search width={17} height={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search position, client, location, requirement…" className="pl-9" />
        </div>
        <Select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter by state"
          className="sm:w-[230px]"
        >
          <option value="">All states ({jobs.length} roles)</option>
          {stateOptions.map(([name, n]) => (
            <option key={name} value={name}>{name} ({n})</option>
          ))}
        </Select>
      </div>

      {stateFilter && (
        <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          Showing <span className="font-semibold text-ink">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "role" : "roles"} in{" "}
          <span className="font-semibold text-ink">{stateFilter}</span>
          <button
            onClick={() => setStateFilter("")}
            className="rounded-[6px] border border-line px-2 py-0.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Clear
          </button>
        </p>
      )}

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
                    <div className="hidden grid-cols-[1fr_160px_110px_130px_96px] gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid">
                      <span>Position</span><span>Location</span><span className="text-right">Pay</span><span>Hire type</span><span />
                    </div>
                    <ul className="divide-y divide-line">
                      {list.map((j) => {
                        const n = candCount(j.id);
                        return (
                          <li key={j.id} className="grid grid-cols-1 gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[1fr_160px_110px_130px_96px] sm:items-center">
                            {/* Position + requirements */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewing(j)}
                                  title="View full job description"
                                  className="truncate rounded-[4px] text-left text-[14px] font-semibold text-ink underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                  {cleanJobTitle(j.position_title)}
                                </button>
                                <Openings n={jobOpenings(j)} />
                              </div>
                              {j.requirements && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-soft">{j.requirements}</p>}
                              <InlineNotes key={`${j.id}:${j.notes ?? ""}`} job={j} />
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
                              <HotToggle hot={j.is_hot} onToggle={() => hot(j)} pending={pending} />
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
        />
      )}

      {editing && (
        <JobForm initial={editing} pending={pending} onClose={() => setEditing(null)} onSave={save} />
      )}
    </PageShell>
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
      <JobFields form={form} set={set} />
    </Modal>
  );
}
