import type { Submittal } from "./types";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Monday-start of the week containing d. */
function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - day);
  return m;
}

/** yyyy-mm-dd of this week's Monday. */
export function weekStartYmd(now: Date = new Date()): string {
  return ymd(startOfWeek(now));
}

export interface SubmittalCounts {
  today: number;
  week: number;
  month: number;
  all: number;
}

/** Count submittals by period using their submitted_at date. */
export function submittalCounts(subs: Submittal[], now: Date = new Date()): SubmittalCounts {
  const todayStr = ymd(now);
  const weekStartStr = ymd(startOfWeek(now));
  const monthPrefix = todayStr.slice(0, 7); // yyyy-mm

  let today = 0, week = 0, month = 0;
  for (const s of subs) {
    const d = s.submitted_at;
    if (d === todayStr) today++;
    if (d >= weekStartStr && d <= todayStr) week++;
    if (d.startsWith(monthPrefix)) month++;
  }
  return { today, week, month, all: subs.length };
}
