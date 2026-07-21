"use client";

import { useState, useTransition } from "react";
import type { Job, Candidate } from "@/lib/types";
import { restoreJob, purgeJob } from "@/lib/actions/jobs";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { Trash, MapPin } from "@/components/icons";
import { cleanJobTitle, jobOpenings } from "@/lib/job-title";
import { JobDetail, Openings, payLabel } from "@/components/jobs/JobDetail";

function deletedWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (days <= 0) return `Today · ${date}`;
  if (days === 1) return `Yesterday · ${date}`;
  return `${days} days ago · ${date}`;
}

/** Recycle bin for reqs. Nothing here shows on Job Openings or Hot Openings. */
export function DeletedJobsClient({ jobs, candidates }: { jobs: Job[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [viewing, setViewing] = useState<Job | null>(null);

  function restore(j: Job) {
    start(async () => {
      await restoreJob(j.id);
      toast(`Restored "${cleanJobTitle(j.position_title)}"`);
    });
  }

  function purge(j: Job) {
    const title = cleanJobTitle(j.position_title);
    if (!confirm(`Permanently delete "${title}" at ${j.client_name}?\n\nThis cannot be undone.`)) return;
    start(async () => {
      await purgeJob(j.id);
      toast("Permanently deleted", "info");
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Deleted Jobs"
        subtitle={
          jobs.length === 0
            ? "Nothing deleted. Reqs you delete land here so you can put them back."
            : `${jobs.length} deleted ${jobs.length === 1 ? "req" : "reqs"} · restore any of them, or clear them for good`
        }
      />

      {jobs.length === 0 ? (
        <Card className="mt-6 px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Trash width={22} height={22} />
          </span>
          <p className="mt-3 font-display font-bold text-ink">Nothing in here</p>
          <p className="mt-1 text-[13.5px] text-muted">
            When you delete a req from Job Openings it moves here instead of disappearing,
            so an accidental delete is always recoverable.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((j) => {
            const title = cleanJobTitle(j.position_title);
                const openings = jobOpenings(j);
            return (
              <Card key={j.id} className="px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setViewing(j)}
                        title="View full job description"
                        className="rounded-[4px] text-left text-[14.5px] font-semibold text-ink underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {title}
                      </button>
                      <Openings n={openings} />
                      <Badge tone="neutral">{j.client_name}</Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                      {j.location && (
                        <span className="flex items-center gap-1">
                          <MapPin width={12} height={12} className="shrink-0 text-faint" />
                          {j.location}
                        </span>
                      )}
                      <span className="font-display font-bold text-accent">{payLabel(j)}</span>
                      <span className="flex items-center gap-1 text-faint">
                        <Trash width={12} height={12} />
                        Deleted {deletedWhen(j.deleted_at)}
                      </span>
                    </div>

                    {j.requirements && (
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-soft">{j.requirements}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={() => restore(j)} disabled={pending}>Restore</Button>
                    <Button size="sm" variant="danger" onClick={() => purge(j)} disabled={pending}>
                      Delete forever
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewing && (
        <JobDetail
          job={viewing}
          candidates={candidates.filter((c) => c.job_id === viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
    </PageShell>
  );
}
