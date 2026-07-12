import type { WeekRow } from "@/lib/weekly-history";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const HISTORY_COLS: { key: keyof WeekRow; label: string; full: string }[] = [
  { key: "outreach", label: "Outreach", full: "Candidate Outreach" },
  { key: "screen", label: "Screens", full: "Candidate Screens" },
  { key: "followup", label: "Follow-ups", full: "Candidate Follow-ups" },
  { key: "client_touchpoint", label: "Client TP", full: "Client Touchpoints" },
  { key: "hot_lead", label: "Hot Leads", full: "Hot Leads Advanced" },
  { key: "sourcingHours", label: "Sourcing", full: "Sourcing Hours" },
  { key: "offer", label: "Offers", full: "Offers Generated" },
  { key: "reengaged", label: "Re-eng.", full: "Previous Candidates Re-engaged" },
  { key: "new_pipeline", label: "New Pipe", full: "New Candidates to Pipeline" },
  { key: "submissions", label: "Subs", full: "Submissions" },
  { key: "hires", label: "Hires", full: "Hires" },
];

export function WeeklyHistoryTable({ rows }: { rows: WeekRow[] }) {
  if (rows.length === 0) {
    return <Card className="p-8 text-center text-[13px] text-muted">No activity logged yet. Your weekly totals will build up here.</Card>;
  }
  const fmt = (v: number, key: keyof WeekRow) => (key === "sourcingHours" ? (v ? `${v}h` : "·") : (v || "·"));
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-2/50 text-[11px] font-semibold uppercase tracking-wide text-faint">
              <th className="sticky left-0 z-10 bg-surface-2/50 px-4 py-2.5 text-left">Week</th>
              {HISTORY_COLS.map((c) => (
                <th key={c.key} title={c.full} className="px-2 py-2.5 text-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weekStart} className={cn("border-b border-line transition-colors hover:bg-surface-2/60", r.isCurrent && "bg-accent-soft/30")}>
                <th scope="row" className={cn("sticky left-0 z-10 px-4 py-2.5 text-left font-semibold", r.isCurrent ? "bg-accent-soft/40 text-accent" : "bg-surface text-ink")}>
                  {r.label}{r.isCurrent && <span className="ml-1.5 text-[10.5px] font-bold uppercase tracking-wide">now</span>}
                </th>
                {HISTORY_COLS.map((c) => (
                  <td key={c.key} className="px-2 py-2.5 text-center nums">
                    {(r[c.key] as number) > 0
                      ? <span className="font-display text-[14px] font-bold text-ink">{fmt(r[c.key] as number, c.key)}</span>
                      : <span className="text-faint">·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
