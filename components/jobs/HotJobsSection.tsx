"use client";

import { useMemo, useState, useTransition } from "react";
import type { Job, Candidate } from "@/lib/types";
import { toggleHot } from "@/lib/actions/jobs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { MapPin, Flame } from "@/components/icons";
import { parseJobTitle } from "@/lib/job-title";
import { statesOf, OTHER_STATE, locationInState } from "@/lib/us-states";
import { JobDetail, InlineNotes, Openings, payLabel, HotToggle } from "@/components/jobs/JobDetail";

/**
 * Reqs pinned to the hot list from the Job Openings tab (jobs.is_hot).
 * Same behaviour as the Jobs tab: click a title for the full JD, notes show
 * under the role, and the flame un-pins it.
 */
export function HotJobsSection({ jobs, candidates }: { jobs: Job[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [viewing, setViewing] = useState<Job | null>(null);
  const [stateFilter, setStateFilter] = useState("");

  function unpin(j: Job) {
    start(async () => {
      await toggleHot(j.id, false);
      toast("Removed from Hot Openings", "info");
    });
  }

  /** States represented among the pinned reqs, with counts. */
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

  const visible = useMemo(
    () => (stateFilter ? jobs.filter((j) => locationInState(j.location, stateFilter)) : jobs),
    [jobs, stateFilter],
  );

  if (jobs.length === 0) {
    return (
      <Card className="mt-4 px-6 py-10 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-warn-soft text-warn">
          <Flame width={20} height={20} />
        </span>
        <p className="mt-3 font-display font-bold text-ink">No pinned reqs yet</p>
        <p className="mt-1 text-[13.5px] text-muted">
          Open <span className="font-semibold text-ink">Job Openings</span> and tap the flame on any req to pin it here.
        </p>
      </Card>
    );
  }

  const byClient = new Map<string, Job[]>();
  for (const j of visible) {
    if (!byClient.has(j.client_name)) byClient.set(j.client_name, []);
    byClient.get(j.client_name)!.push(j);
  }
  const clients = [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      {stateOptions.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label="Filter pinned reqs by state"
            className="w-full sm:w-[230px]"
          >
            <option value="">All states ({jobs.length} pinned)</option>
            {stateOptions.map(([name, n]) => (
              <option key={name} value={name}>{name} ({n})</option>
            ))}
          </Select>
          {stateFilter && (
            <button
              onClick={() => setStateFilter("")}
              className="rounded-[6px] border border-line px-2 py-0.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {clients.length === 0 ? (
        <Card className="mt-4 px-6 py-10 text-center">
          <p className="font-display font-bold text-ink">No pinned reqs in {stateFilter}</p>
          <p className="mt-1 text-[13.5px] text-muted">Pick a different state, or clear the filter.</p>
        </Card>
      ) : (
      <div className="mt-4 space-y-3">
        {clients.map(([client, list]) => (
          <Card key={client} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line bg-surface-2/40 px-4 py-3">
              <h3 className="font-display text-[15px] font-bold text-ink">{client}</h3>
              <Badge tone="neutral">{list.length} {list.length === 1 ? "role" : "roles"}</Badge>
            </div>

            <ul className="divide-y divide-line">
              {list.map((j) => {
                const { title, openings } = parseJobTitle(j.position_title);
                return (
                  <li key={j.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setViewing(j)}
                          title="View full job description"
                          className="rounded-[4px] text-left text-[14px] font-semibold text-ink underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {title}
                        </button>
                        <Openings n={openings} />
                        {j.status !== "Open" && <Badge tone="warn">{j.status}</Badge>}
                      </div>
                      {j.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                          <MapPin width={12} height={12} className="shrink-0 text-faint" />
                          {j.location}
                        </p>
                      )}
                      {j.requirements && (
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{j.requirements}</p>
                      )}
                      <InlineNotes key={`${j.id}:${j.notes ?? ""}`} job={j} />
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      <span className="font-display text-[14px] font-bold text-accent whitespace-nowrap">{payLabel(j)}</span>
                      <HotToggle hot onToggle={() => unpin(j)} pending={pending} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
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
    </>
  );
}
