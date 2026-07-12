import type { Activity, Submittal, Interview, Candidate } from "./types";
import { GOALS, isEngineeringRole } from "./kpi";
import { startOfWeek, sumSince, ymd } from "./activity-stats";

/** Build the weekly KPI report (subject + body) from current data. */
export function buildWeeklyReport(
  activities: Activity[],
  submittals: Submittal[],
  interviews: Interview[],
  candidates: Candidate[],
  now: Date = new Date(),
): { subject: string; body: string } {
  const weekStart = startOfWeek(now);
  const weekMs = weekStart.getTime();
  const todayStr = ymd(now);
  const weekStartStr = ymd(weekStart);
  const weekEndStr = ymd(new Date(weekMs + 6 * 86_400_000));
  const monthPrefix = todayStr.slice(0, 7);

  const inWeek = (d: string | null) => !!d && d >= weekStartStr && d <= weekEndStr;
  const iDate = (iso: string | null) => (iso ? ymd(new Date(iso)) : null);

  const submissionsW = submittals.filter((s) => inWeek(s.submitted_at)).length;
  const engSubsW = submittals.filter((s) => inWeek(s.submitted_at) && isEngineeringRole(s.position)).length;
  const interviewsW = interviews.filter((i) => inWeek(iDate(i.scheduled_at))).length;
  const started = candidates.filter((c) => c.stage === "Started" && c.start_date);
  const hiresW = started.filter((c) => inWeek(c.start_date)).length;
  const hiresM = started.filter((c) => (c.start_date as string).startsWith(monthPrefix)).length;
  const engPlaceM = started.filter((c) => (c.start_date as string).startsWith(monthPrefix) && isEngineeringRole(c.role)).length;

  const w = (t: string) => sumSince(activities, t, weekMs);
  const pretty = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Outreach notes logged this week, with their client/job context.
  const outreachNotes = activities
    .filter((a) => a.type === "outreach" && a.notes && a.notes.trim() && new Date(a.occurred_at).getTime() >= weekMs)
    .map((a) => {
      const tag = a.job_label
        ? [a.client_name, a.job_label].filter(Boolean).join(" · ")
        : (a.client_name || "General");
      return `- ${tag} (${a.amount}): ${a.notes!.trim()}`;
    });
  const notesBlock = outreachNotes.length
    ? [``, `OUTREACH NOTES`, ...outreachNotes]
    : [];

  // Every submittal event logged this week (a name can appear more than once if
  // submitted to multiple clients — that's real weekly activity).
  const weekSubs = submittals
    .filter((s) => inWeek(s.submitted_at))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const weekSubList = weekSubs.map((s) => {
    const detail = [s.position, s.client_name].filter(Boolean).join(" · ");
    return `- ${s.candidate_name}${detail ? ` — ${detail}` : ""} (${pretty(s.submitted_at)})`;
  });
  const weekSubBlock = weekSubList.length
    ? [``, `THIS WEEK'S SUBMITTALS (${weekSubList.length})`, ...weekSubList]
    : [];

  // Pipeline of possible hires: everyone currently in "Submitted" (awaiting a
  // client decision), de-duplicated by name so each person shows once.
  const seenPending = new Set<string>();
  const pendingFeedback = candidates
    .filter((c) => c.stage === "Submitted")
    .filter((c) => { const k = c.name.trim().toLowerCase(); if (seenPending.has(k)) return false; seenPending.add(k); return true; })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `- ${c.name}${[c.role, c.client_company].filter(Boolean).length ? ` (${[c.role, c.client_company].filter(Boolean).join(" · ")})` : ""}`);
  const pendingBlock = pendingFeedback.length
    ? [``, `PIPELINE — SUBMITTED, AWAITING CLIENT FEEDBACK (${pendingFeedback.length})`, `(Possible hires currently in play)`, ...pendingFeedback]
    : [];

  const body = [
    `Weekly KPI Report — Lia`,
    `Week of ${pretty(weekStartStr)} to ${pretty(todayStr)}`,
    ``,
    `WEEKLY KPIs`,
    `- Submissions: ${submissionsW} / ${GOALS.submissionsWeekly.goal}`,
    `- Interviews / Phone Screens: ${interviewsW} / ${GOALS.interviewsWeekly.goal}`,
    `- Offers Generated: ${w("offer")} / 2`,
    `- Hires: ${hiresW} / ${GOALS.hiresWeekly.goal}`,
    `- Engineering Submissions: ${engSubsW} / ${GOALS.engSubmissionsWeekly.goal}`,
    `- Previous Candidates Re-engaged: ${w("reengaged")} / 25`,
    `- New Candidates Added to Pipeline: ${w("new_pipeline")} / 50`,
    ...weekSubBlock,
    ...pendingBlock,
    ``,
    `DAILY ACTIVITY (this week's totals)`,
    `- Candidate Outreach: ${w("outreach")}`,
    `- Candidate Screens: ${w("screen")}`,
    `- Candidate Follow-ups: ${w("followup")}`,
    `- Client Touchpoints: ${w("client_touchpoint")}`,
    `- Hot Leads Advanced: ${w("hot_lead")}`,
    `- Sourcing Time: ${(w("sourcing_minutes") / 60).toFixed(1)} hrs`,
    ``,
    `MONTH TO DATE`,
    `- Hires: ${hiresM} / ${GOALS.hiresMonthly.goal}`,
    `- Engineering Placements: ${engPlaceM} / ${GOALS.engPlacementsMonthly.goal}`,
    ...notesBlock,
    ``,
    `Thanks,`,
    `Lia`,
  ].join("\n");

  return { subject: `Weekly KPI Report — Lia — Week of ${pretty(weekStartStr)}`, body };
}
