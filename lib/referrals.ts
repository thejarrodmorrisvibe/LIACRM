/*
  Referral bonus: $250 when a referred candidate works 30 working days.
  Default assumes a Mon–Fri schedule. We also compute a Saturday-inclusive
  date (Mon–Sat) so you know when the bonus would be due if they work Saturdays.
*/

export const REFERRAL_BONUS = 250;
export const REFERRAL_WORKING_DAYS = 30;

const parse = (d: string) => new Date(d + "T00:00:00Z");
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Date (yyyy-mm-dd) of the Nth working day on/after `startStr`.
 * Working days are Mon–Fri, or Mon–Sat when includeSaturday is true.
 * The start date counts as day 1 if it is itself a working day.
 */
export function nthWorkingDay(startStr: string, n: number, includeSaturday: boolean): string {
  let d = parse(startStr);
  let count = 0;
  for (let i = 0; i < 1000; i++) {
    const dow = d.getUTCDay(); // 0 = Sun … 6 = Sat
    const working = dow !== 0 && (includeSaturday || dow !== 6);
    if (working) {
      count++;
      if (count === n) return fmt(d);
    }
    d = new Date(d.getTime() + 86_400_000);
  }
  return fmt(d);
}

export interface ReferralStatus {
  mfDate: string | null; // bonus due assuming Mon–Fri
  satDate: string | null; // bonus due if they also work Saturdays (earlier)
  achieved: boolean; // 30 Mon–Fri working days reached
  achievedIfSat: boolean; // 30 Mon–Sat working days reached
  daysUntil: number | null; // calendar days until the Mon–Fri bonus date
}

export function referralStatus(
  startStr: string | null,
  todayStr: string,
  days: number = REFERRAL_WORKING_DAYS,
): ReferralStatus {
  if (!startStr) {
    return { mfDate: null, satDate: null, achieved: false, achievedIfSat: false, daysUntil: null };
  }
  const mfDate = nthWorkingDay(startStr, days, false);
  const satDate = nthWorkingDay(startStr, days, true);
  const daysUntil = Math.round((parse(mfDate).getTime() - parse(todayStr).getTime()) / 86_400_000);
  return {
    mfDate,
    satDate,
    achieved: todayStr >= mfDate,
    achievedIfSat: todayStr >= satDate,
    daysUntil,
  };
}
