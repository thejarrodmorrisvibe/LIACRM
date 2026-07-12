import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dollar, Clock, Users, Sparkles } from "@/components/icons";
import { listCandidates } from "@/lib/actions/candidates";
import { isActivelyWorking, accruesCommission } from "@/lib/types";
import {
  candidateCommission, weeksWorked, rollupByQuarter, quarterOf,
  currentQuarterAccrued, projectedCurrentQuarter, totalToDate, WEEKLY_RATE, WEEKLY_HOURS,
} from "@/lib/commission";
import { usd, prettyDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const candidates = await listCandidates();
  const now = new Date();

  const withStart = candidates.filter(accruesCommission);
  const spans = withStart.map((c) => ({ start: c.start_date as string, end: c.end_date }));

  const rollup = rollupByQuarter(spans, now);
  const quarters = Object.keys(rollup).sort();
  const maxQ = Math.max(1, ...Object.values(rollup));
  const thisQ = quarterOf(now);

  const activeCount = candidates.filter((c) => isActivelyWorking(c, now)).length;
  const rows = withStart
    .map((c) => ({
      c,
      wks: weeksWorked(c.start_date as string, c.end_date, now),
      earned: candidateCommission(c.start_date as string, c.end_date, now),
      active: isActivelyWorking(c, now),
    }))
    .sort((a, b) => b.earned - a.earned);

  return (
    <PageShell>
      <PageHeader
        title="Commissions"
        subtitle="A ballpark estimate at $0.25/hour, based on a flat 40-hour work week."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`${thisQ.replace("-", " ")} so far`} value={usd(currentQuarterAccrued(spans, now))} accent="blue" icon={<Dollar width={18} height={18} />} sub="accrued this quarter" />
        <StatCard label="Projected quarter" value={usd(projectedCurrentQuarter(spans, now))} accent="cyan" icon={<Sparkles width={18} height={18} />} sub="if everyone keeps working" />
        <StatCard label="All-time to date" value={usd(totalToDate(spans, now))} accent="emerald" icon={<Clock width={18} height={18} />} sub="across all candidates" />
        <StatCard label="Earning now" value={activeCount} accent="amber" icon={<Users width={18} height={18} />} sub={`${usd(activeCount * WEEKLY_RATE)}/wk`} />
      </div>

      <Card className="mt-6 p-5">
        <h3 className="font-display text-[15px] font-bold text-ink">By Quarter</h3>
        <p className="mt-0.5 text-[13px] text-muted">Estimated commission earned per calendar quarter.</p>
        {quarters.length === 0 ? (
          <p className="mt-6 text-[13.5px] text-muted">No commission yet. Mark a candidate Started with a start date to begin.</p>
        ) : (
          <div className="mt-6 flex items-end gap-4 overflow-x-auto scroll-thin pb-2" style={{ minHeight: 200 }}>
            {quarters.map((q) => {
              const val = rollup[q];
              const pct = Math.round((val / maxQ) * 100);
              const isNow = q === thisQ;
              return (
                <div key={q} className="flex min-w-[64px] flex-1 flex-col items-center gap-2">
                  <span className="font-display text-[13px] font-bold text-ink nums">{usd(val)}</span>
                  <div className="flex h-[140px] w-full items-end">
                    <div
                      className={isNow ? "brand-gradient w-full rounded-t-[8px]" : "w-full rounded-t-[8px] bg-accent/25"}
                      style={{ height: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <span className={isNow ? "text-[12px] font-bold text-accent" : "text-[12px] text-muted"}>
                    {q.replace("-", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-[15px] font-bold text-ink">Per Candidate</h3>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13.5px] text-muted">No candidates with a start date yet.</p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-faint">
                  <th className="px-5 py-3 font-semibold">Candidate</th>
                  <th className="px-3 py-3 font-semibold">Period</th>
                  <th className="px-3 py-3 font-semibold text-right">Hours</th>
                  <th className="px-3 py-3 font-semibold text-right">Weeks</th>
                  <th className="px-5 py-3 font-semibold text-right">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ c, wks, earned, active }) => (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14px] font-semibold text-ink">{c.name}</span>
                        {active ? <Badge tone="ok" dot>Active</Badge> : <Badge tone="neutral">Ended</Badge>}
                      </div>
                      <div className="text-[12.5px] text-muted">{c.client_company}</div>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-ink-soft nums">
                      {prettyDate(c.start_date)} → {c.end_date ? prettyDate(c.end_date) : "now"}
                    </td>
                    <td className="px-3 py-3.5 text-right text-[13.5px] font-semibold text-ink nums">{Math.round(wks * WEEKLY_HOURS).toLocaleString()}</td>
                    <td className="px-3 py-3.5 text-right text-[13px] text-muted nums">{wks.toFixed(1)}</td>
                    <td className="px-5 py-3.5 text-right font-display text-[15px] font-bold text-ink nums">{usd(earned, { cents: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 px-1 text-[12.5px] text-muted">
        Estimates assume 40 paid hours every week with no gaps. Real commission depends on actual
        hours worked, so treat these as a planning ballpark, not exact figures.
      </p>
    </PageShell>
  );
}
