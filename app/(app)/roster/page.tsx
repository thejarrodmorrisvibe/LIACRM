import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Dollar, Briefcase, Clock, Sparkles } from "@/components/icons";
import { listCandidates } from "@/lib/actions/candidates";
import { listJobs } from "@/lib/actions/jobs";
import { isActivelyWorking } from "@/lib/types";
import {
  candidateCommission, weeksWorked, currentQuarterAccrued,
  projectedCurrentQuarter, WEEKLY_RATE,
} from "@/lib/commission";
import { usd, prettyDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);
  const now = new Date();

  const active = candidates
    .filter((c) => isActivelyWorking(c, now))
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));

  const allSpans = candidates
    .filter((c) => c.start_date)
    .map((c) => ({ start: c.start_date as string, end: c.end_date }));

  const qAccrued = currentQuarterAccrued(allSpans, now);
  const qProjected = projectedCurrentQuarter(allSpans, now);
  const weeklyRunRate = active.length * WEEKLY_RATE;
  const openJobs = jobs.filter((j) => j.status === "Open").length;

  return (
    <PageShell>
      <PageHeader
        title="Active Roster"
        subtitle={`${active.length} ${active.length === 1 ? "candidate is" : "candidates are"} working under your recruitment right now.`}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Working now" value={active.length} accent="emerald"
          icon={<Users width={18} height={18} />} sub={`${usd(weeklyRunRate)}/wk run rate`} />
        <StatCard label="This quarter" value={usd(qAccrued)} accent="blue"
          icon={<Dollar width={18} height={18} />} sub="accrued so far" />
        <StatCard label="Projected quarter" value={usd(qProjected)} accent="cyan"
          icon={<Sparkles width={18} height={18} />} sub="if everyone keeps working" />
        <StatCard label="Open jobs" value={openJobs} accent="amber"
          icon={<Briefcase width={18} height={18} />} sub="reqs you're filling" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-[15px] font-bold text-ink">Currently Working</h3>
          <Badge tone="ok" dot>Live</Badge>
        </div>

        {active.length === 0 ? (
          <EmptyRoster />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-faint">
                  <th className="px-5 py-3 font-semibold">Candidate</th>
                  <th className="px-3 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold text-right">Pay Rate</th>
                  <th className="px-3 py-3 font-semibold">Started</th>
                  <th className="px-3 py-3 font-semibold text-right">Weeks</th>
                  <th className="px-5 py-3 font-semibold text-right">Commission to date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {active.map((c) => {
                  const wks = weeksWorked(c.start_date as string, c.end_date, now);
                  const earned = candidateCommission(c.start_date as string, c.end_date, now);
                  return (
                    <tr key={c.id} className="group transition-colors hover:bg-surface-2">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div>
                            <div className="text-[14px] font-semibold text-ink">{c.name}</div>
                            <div className="text-[12.5px] text-muted">{c.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-[13.5px] text-ink-soft">{c.client_company}</td>
                      <td className="px-3 py-3.5 text-right text-[13.5px] font-medium text-ink-soft nums">
                        {c.pay_rate != null ? `$${c.pay_rate}/hr` : <span className="text-faint">n/a</span>}
                      </td>
                      <td className="px-3 py-3.5 text-[13.5px] text-ink-soft nums">{prettyDate(c.start_date)}</td>
                      <td className="px-3 py-3.5 text-right text-[13.5px] font-medium text-ink-soft nums">
                        {wks.toFixed(1)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-display text-[15px] font-bold text-ok nums">{usd(earned, { cents: true })}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent">
      {initials}
    </span>
  );
}

function EmptyRoster() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Users width={22} height={22} />
      </span>
      <p className="mt-3 font-display text-[15px] font-bold text-ink">No one on the roster yet</p>
      <p className="mt-1 max-w-sm text-[13.5px] text-muted">
        When you mark a candidate as <strong>Started</strong> in the pipeline and give them a start
        date, they&apos;ll show up here and begin accruing commission automatically.
      </p>
    </div>
  );
}
