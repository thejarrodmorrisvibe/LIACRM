"use client";

import type { ReactNode } from "react";
import type { Job, Candidate } from "@/lib/types";
import { JOB_STATUS_TONE, STAGE_LABEL } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Edit, Users } from "@/components/icons";
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

/** Read-only full job description, opened by clicking a position title. */
export function JobDetail({
  job, candidates, onClose, onEdit,
}: {
  job: Job;
  candidates: Candidate[];
  onClose: () => void;
  onEdit?: () => void;
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
          {onEdit && <Button onClick={onEdit}><Edit width={16} height={16} /> Edit</Button>}
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
      <DetailSection label="Notes" body={job.notes} />

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
