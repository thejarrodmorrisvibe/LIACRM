/*
  Rolls activity events, submittals, and hires up into a week-by-week KPI history
  (Monday-start weeks), so the user keeps a running record instead of only the
  current week that resets each Monday.
*/
import type { Activity, Submittal, Candidate } from "./types";
import { startOfWeek, ymd } from "./activity-stats";

export interface WeekRow {
  weekStart: string; // yyyy-mm-dd (Monday)
  label: string;     // "Jun 30 – Jul 6"
  isCurrent: boolean;
  outreach: number;
  screen: number;
  followup: number;
  client_touchpoint: number;
  hot_lead: number;
  sourcingHours: number;
  offer: number;
  reengaged: number;
  new_pipeline: number;
  submissions: number;
  hires: number;
}

const blankRow = (weekStart: string, isCurrent: boolean): WeekRow => ({
  weekStart, label: "", isCurrent,
  outreach: 0, screen: 0, followup: 0, client_touchpoint: 0, hot_lead: 0,
  sourcingHours: 0, offer: 0, reengaged: 0, new_pipeline: 0, submissions: 0, hires: 0,
});

// yyyy-mm-dd of the Monday that starts the week containing this timestamp.
// Date-only strings are parsed at local noon so week bucketing never drifts a day.
function weekKeyFromIso(iso: string): string {
  return ymd(startOfWeek(new Date(iso)));
}
function weekKeyFromDate(d: string): string {
  return ymd(startOfWeek(new Date(d + "T12:00:00")));
}

function label(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function buildWeeklyHistory(
  activities: Activity[],
  submittals: Submittal[],
  candidates: Candidate[],
  now: Date = new Date(),
  maxWeeks = 12,
): WeekRow[] {
  const rows = new Map<string, WeekRow>();
  const ensure = (key: string) => {
    let r = rows.get(key);
    if (!r) { r = blankRow(key, false); rows.set(key, r); }
    return r;
  };

  for (const a of activities) {
    const r = ensure(weekKeyFromIso(a.occurred_at));
    const amt = a.amount || 1;
    switch (a.type) {
      case "outreach": r.outreach += amt; break;
      case "screen": r.screen += amt; break;
      case "followup": r.followup += amt; break;
      case "client_touchpoint": r.client_touchpoint += amt; break;
      case "hot_lead": r.hot_lead += amt; break;
      case "sourcing_minutes": r.sourcingHours += amt / 60; break;
      case "offer": r.offer += amt; break;
      case "reengaged": r.reengaged += amt; break;
      case "new_pipeline": r.new_pipeline += amt; break;
    }
  }

  for (const s of submittals) {
    if (!s.submitted_at) continue;
    ensure(weekKeyFromDate(s.submitted_at)).submissions += 1;
  }

  for (const c of candidates) {
    if (c.stage === "Started" && c.start_date) {
      ensure(weekKeyFromDate(c.start_date)).hires += 1;
    }
  }

  // Always include the current week even if it has no data yet.
  const currentKey = ymd(startOfWeek(now));
  ensure(currentKey).isCurrent = true;

  return [...rows.values()]
    .map((r) => ({ ...r, sourcingHours: +r.sourcingHours.toFixed(1), label: label(r.weekStart), isCurrent: r.weekStart === currentKey }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, maxWeeks);
}
