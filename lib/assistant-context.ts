/*
  Builds a compact JSON snapshot of the CRM for the AI assistant to reason over.
  Kept intentionally small (labels, counts, key fields) to bound token cost.
*/
import { listJobs } from "@/lib/actions/jobs";
import { listSubmittals } from "@/lib/actions/submittals";
import { listCandidates } from "@/lib/actions/candidates";
import { listActivities, listAllActivities } from "@/lib/actions/activities";
import { buildWeeklyHistory } from "@/lib/weekly-history";
import { HOT_OPENINGS, openingSeats, clientSeats } from "@/lib/hot-openings";
import { parseJobTitle } from "@/lib/job-title";
import { ACTIVITIES, GOALS, isEngineeringRole } from "@/lib/kpi";
import { startOfToday, startOfWeek, startOfMonth, sumSince, ymd } from "@/lib/activity-stats";
import {
  currentQuarterAccrued, projectedCurrentQuarter, totalToDate, WEEKLY_RATE, quarterOf,
} from "@/lib/commission";
import { isActivelyWorking, accruesCommission } from "@/lib/types";

function pay(min: number | null, max: number | null, type: string): string {
  if (min == null && max == null) return "TBD";
  const unit = type === "salary" ? "/yr" : "/hr";
  const f = (n: number) => (type === "salary" ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min != null && max != null) return min === max ? `${f(min)}${unit}` : `${f(min)}-${f(max)}${unit}`;
  return `${f((min ?? max)!)}${unit}`;
}

export async function buildAssistantContext() {
  const [jobs, submittals, candidates, activities, allActivities] = await Promise.all([
    listJobs(), listSubmittals(), listCandidates(), listActivities(), listAllActivities(),
  ]);

  const now = new Date();
  const todayStr = ymd(now);
  const weekMs = startOfWeek().getTime();
  const todayMs = startOfToday().getTime();
  const monthMs = startOfMonth().getTime();
  const weekStartStr = ymd(startOfWeek());
  const weekEndStr = ymd(new Date(weekMs + 6 * 86_400_000));
  const monthPrefix = todayStr.slice(0, 7);
  const inWeek = (d: string | null) => !!d && d >= weekStartStr && d <= weekEndStr;

  // Hot openings — live GAL USA hot list, grouped state -> client -> role
  const hotOpenings = HOT_OPENINGS.map((s) => ({
    state: s.state,
    minWage: s.minWage,
    note: s.note ?? null,
    seats: s.clients.reduce((n, c) => n + clientSeats(c), 0),
    clients: s.clients.map((c) => ({
      client: c.client,
      city: c.city,
      onHold: c.hold ?? false,
      salesRequest: c.sales ?? false,
      note: c.note ?? null,
      roles: c.openings.map((o) => ({
        position: o.position,
        seats: openingSeats(o),
        pay: o.pay || "TBD",
        city: o.city ?? c.city,
        requirement: o.detail ?? null,
      })),
    })),
  }));

  // Job openings (detailed list)
  const jobOpenings = jobs.map((j) => {
    const { openings, title } = parseJobTitle(j.position_title);
    return {
      client: j.client_name, position: title, openings, location: j.location ?? null,
      pay: pay(j.pay_min, j.pay_max, j.pay_type), hireType: j.job_type ?? null,
      status: j.status, hot: j.is_hot, requirements: j.requirements ?? null,
      description: j.description ?? null,
    };
  });

  // Submittals (most recent 80)
  const subs = [...submittals]
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, 80)
    .map((s) => ({ candidate: s.candidate_name, client: s.client_name, position: s.position, payRate: s.pay_rate, location: s.location, date: s.submitted_at }));

  // Candidates
  const cands = candidates.map((c) => ({
    name: c.name, role: c.role, client: c.client_company, stage: c.stage,
    startDate: c.start_date, endDate: c.end_date, payRate: c.pay_rate,
  }));
  const workingNow = candidates.filter((c) => isActivelyWorking(c, now)).map((c) => c.name);
  const upcomingStarts = candidates
    .filter((c) => c.start_date && c.start_date >= todayStr && (c.stage === "Tracking" || c.stage === "Started"))
    .sort((a, b) => (a.start_date as string).localeCompare(b.start_date as string))
    .map((c) => ({ name: c.name, role: c.role, client: c.client_company, startDate: c.start_date }));

  // Activity KPIs this week
  const w = (t: string) => sumSince(activities, t, weekMs);
  const started = candidates.filter((c) => c.stage === "Started" && c.start_date);
  const activityThisWeek = {
    candidateOutreach: sumSince(activities, "outreach", weekMs),
    candidateOutreachToday: sumSince(activities, "outreach", todayMs, todayMs + 86_400_000),
    candidateScreens: w("screen"),
    candidateFollowups: w("followup"),
    clientTouchpoints: w("client_touchpoint"),
    hotLeadsAdvanced: w("hot_lead"),
    sourcingHours: +(w("sourcing_minutes") / 60).toFixed(1),
    offersGenerated: w("offer"),
    previousCandidatesReengaged: w("reengaged"),
    newCandidatesToPipeline: w("new_pipeline"),
    submissionsThisWeek: submittals.filter((s) => inWeek(s.submitted_at)).length,
    interviewsThisWeek: 0, // interviews tracked separately; omitted here
    hiresThisWeek: started.filter((c) => inWeek(c.start_date)).length,
    hiresThisMonth: started.filter((c) => (c.start_date as string).startsWith(monthPrefix)).length,
    engineeringSubmissionsThisWeek: submittals.filter((s) => inWeek(s.submitted_at) && isEngineeringRole(s.position)).length,
  };

  // Commission
  const spans = candidates.filter(accruesCommission).map((c) => ({ start: c.start_date as string, end: c.end_date }));
  const commission = {
    quarter: quarterOf(now).replace("-", " "),
    accruedThisQuarter: Math.round(currentQuarterAccrued(spans, now)),
    projectedThisQuarter: Math.round(projectedCurrentQuarter(spans, now)),
    allTimeToDate: Math.round(totalToDate(spans, now)),
    weeklyRunRate: candidates.filter((c) => isActivelyWorking(c, now)).length * WEEKLY_RATE,
  };

  const goals = {
    dailyActivityTargets: Object.fromEntries(ACTIVITIES.filter((a) => a.cadence === "daily").map((a) => [a.label, a.range ?? a.goal])),
    weeklyActivityTargets: Object.fromEntries(ACTIVITIES.filter((a) => a.cadence === "weekly").map((a) => [a.label, a.range ?? a.goal])),
    submissionsWeekly: GOALS.submissionsWeekly.range, interviewsWeekly: GOALS.interviewsWeekly.range,
    hiresWeekly: GOALS.hiresWeekly.range, hiresMonthly: GOALS.hiresMonthly.range,
    engSubmissionsWeekly: GOALS.engSubmissionsWeekly.range, engPlacementsMonthly: GOALS.engPlacementsMonthly.range,
  };

  return {
    today: todayStr,
    recruiter: "Lia (GAL AeroStaff)",
    counts: { openJobs: jobs.filter((j) => j.status === "Open").length, clients: new Set(jobs.map((j) => j.client_name)).size, workingNow: workingNow.length, totalSubmittals: submittals.length },
    hotOpenings,
    jobOpenings,
    submittals: subs,
    candidates: cands,
    workingNow,
    upcomingStarts,
    activityThisWeek,
    weeklyHistory: buildWeeklyHistory(allActivities, submittals, candidates, now),
    commission,
    goals,
  };
}
