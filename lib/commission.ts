/*
  Commission engine — a deliberate BALLPARK based on a flat 40-hour week.
  Rule: $0.25 per hour worked. Accrues from a candidate's start_date until the
  earlier of today or their end_date (null end_date = still working).
*/

export const HOURLY_COMMISSION = 0.25;
export const WEEKLY_HOURS = 40;
export const WEEKLY_RATE = WEEKLY_HOURS * HOURLY_COMMISSION; // $10 / week
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function toMs(d: string): number {
  // Bare yyyy-mm-dd is parsed by JS as UTC midnight; full ISO strings keep
  // their own offset. Parsing consistently avoids timezone drift in the math.
  return new Date(d).getTime();
}

/** Fractional weeks a candidate has worked as of `now`. */
export function weeksWorked(start: string, end: string | null, now: Date): number {
  const startMs = toMs(start);
  const endMs = end ? Math.min(toMs(end), now.getTime()) : now.getTime();
  if (endMs <= startMs) return 0;
  return (endMs - startMs) / MS_PER_WEEK;
}

/** Total commission a candidate has earned so far (to date). */
export function candidateCommission(start: string, end: string | null, now: Date): number {
  return weeksWorked(start, end, now) * WEEKLY_RATE;
}

/*
  GAL's fiscal year starts May 1 — NOT the calendar year:
    Q1 = May 1  - Jul 31
    Q2 = Aug 1  - Oct 31
    Q3 = Nov 1  - Jan 31   (straddles the calendar year)
    Q4 = Feb 1  - Apr 30
  A fiscal year is labeled by the calendar year it opens in, so Nov 2026,
  Dec 2026 and Jan 2027 all fall in "2026-Q3".
*/
export const FISCAL_START_MONTH = 4; // 0-indexed; 4 = May

function fiscalParts(d: Date): { fy: number; qIdx: number } {
  const m = d.getMonth();
  const monthsIn = (m - FISCAL_START_MONTH + 12) % 12; // 0..11 months since May 1
  const qIdx = Math.floor(monthsIn / 3); // 0..3
  // Jan-Apr belong to the fiscal year that opened the previous May.
  const fy = m >= FISCAL_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
  return { fy, qIdx };
}

/** Fiscal-quarter label for a date, e.g. "2026-Q1" for July 2026. */
export function quarterOf(d: Date): string {
  const { fy, qIdx } = fiscalParts(d);
  return `${fy}-Q${qIdx + 1}`;
}

/** First instant of the fiscal quarter containing `d`. */
export function startOfQuarter(d: Date): Date {
  const { fy, qIdx } = fiscalParts(d);
  // Month overflow rolls the year forward automatically (e.g. month 13 -> Feb of fy+1).
  return new Date(fy, FISCAL_START_MONTH + qIdx * 3, 1, 0, 0, 0);
}

type Span = { start: string; end: string | null };

/**
 * Distribute each candidate's earnings into the quarters they span.
 * Walks week-by-week; a partial final week is prorated. Returns a map of
 * quarter label -> dollars. (Ballpark; good enough for planning.)
 */
export function rollupByQuarter(cands: Span[], now: Date): Record<string, number> {
  const buckets: Record<string, number> = {};
  for (const c of cands) {
    if (!c.start) continue;
    const startMs = toMs(c.start);
    const endMs = c.end ? Math.min(toMs(c.end), now.getTime()) : now.getTime();
    if (endMs <= startMs) continue;

    let cursor = startMs;
    while (cursor < endMs) {
      const next = Math.min(cursor + MS_PER_WEEK, endMs);
      const fraction = (next - cursor) / MS_PER_WEEK;
      const q = quarterOf(new Date(cursor));
      buckets[q] = (buckets[q] ?? 0) + WEEKLY_RATE * fraction;
      cursor = next;
    }
  }
  return buckets;
}

/** Commission accrued in the quarter containing `now`. */
export function currentQuarterAccrued(cands: Span[], now: Date = new Date()): number {
  return rollupByQuarter(cands, now)[quarterOf(now)] ?? 0;
}

/**
 * Projected total for the CURRENT quarter: what's accrued so far plus the
 * remaining weeks in the quarter for everyone still actively working.
 */
export function projectedCurrentQuarter(
  cands: Span[],
  now: Date = new Date(),
): number {
  const accrued = currentQuarterAccrued(cands, now);
  const quarterEnd = endOfQuarter(now);
  const remainingWeeks = Math.max(0, (quarterEnd.getTime() - now.getTime()) / MS_PER_WEEK);
  const stillActive = cands.filter((c) => {
    if (!c.start) return false;
    if (toMs(c.start) > now.getTime()) return false;
    return !c.end || toMs(c.end) >= now.getTime();
  }).length;
  return accrued + remainingWeeks * stillActive * WEEKLY_RATE;
}

/** Last instant of the fiscal quarter containing `d`. */
export function endOfQuarter(d: Date): Date {
  const { fy, qIdx } = fiscalParts(d);
  // Day 0 of the month after the quarter's final month = that final month's last day.
  return new Date(fy, FISCAL_START_MONTH + qIdx * 3 + 3, 0, 23, 59, 59);
}

/** Total commission to date across all candidates. */
export function totalToDate(cands: Span[], now: Date = new Date()): number {
  return cands.reduce((sum, c) => sum + (c.start ? candidateCommission(c.start, c.end, now) : 0), 0);
}
