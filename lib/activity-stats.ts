import type { Activity } from "./types";

/* Local-time period boundaries (the user's day/week/month). */
export function startOfToday(d: Date = new Date()): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
export function startOfWeek(d: Date = new Date()): Date {
  const x = startOfToday(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; // Monday start
}
export function startOfMonth(d: Date = new Date()): Date {
  const x = startOfToday(d); x.setDate(1); return x;
}
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Sum of an activity type in the window [sinceMs, untilMs).
 * `untilMs` defaults to Infinity (open-ended) so existing callers are unchanged;
 * pass an upper bound to keep future-dated events from leaking into "today".
 */
export function sumSince(activities: Activity[], type: string, sinceMs: number, untilMs = Infinity): number {
  let n = 0;
  for (const a of activities) {
    if (a.type !== type) continue;
    const t = new Date(a.occurred_at).getTime();
    if (t >= sinceMs && t < untilMs) n += a.amount || 1;
  }
  return n;
}

/** Count date-string records (yyyy-mm-dd) that fall on/after a cutoff yyyy-mm-dd. */
export function countByDate(dates: (string | null)[], sinceYmd: string, untilYmd: string): number {
  return dates.filter((d) => d != null && d >= sinceYmd && d <= untilYmd).length;
}
