/*
  GAL AeroStaff KPI targets (team performance expectations).
  Goal numbers use the LOWER bound of each range (the floor / minimum).
*/

export type Cadence = "daily" | "weekly" | "monthly";

export interface ActivityMetric {
  type: string;        // key stored in the `activities` table
  label: string;
  cadence: Cadence;    // the cadence its goal is measured on
  goal: number;        // target for that cadence (lower bound)
  range?: string;      // display range, e.g. "50–100"
  unit?: "count" | "minutes";
  step?: number;       // amount added per click (default 1)
  accent?: string;     // bar color
  alsoCounts?: string[]; // other activity types this click also logs (e.g. a follow-up also counts as outreach)
}

/** Activities you tally by clicking a button (stored in `activities`). */
export const ACTIVITIES: ActivityMetric[] = [
  { type: "outreach", label: "Candidate Outreach", cadence: "daily", goal: 50, range: "50–100", accent: "#2f6bff" },
  { type: "screen", label: "Candidate Screens", cadence: "daily", goal: 3, range: "3–5", accent: "#18c5e6" },
  { type: "followup", label: "Candidate Follow-ups", cadence: "daily", goal: 10, accent: "#6366f1", alsoCounts: ["outreach", "reengaged"] },
  { type: "client_touchpoint", label: "Client Touchpoints", cadence: "daily", goal: 2, accent: "#8b5cf6" },
  { type: "hot_lead", label: "Hot Leads Advanced", cadence: "daily", goal: 1, accent: "#f5a524" },
  { type: "sourcing_minutes", label: "Sourcing Time", cadence: "daily", goal: 120, unit: "minutes", step: 30, accent: "#11b886" },
  { type: "offer", label: "Offers Generated", cadence: "weekly", goal: 2, range: "2–4", accent: "#f0526d" },
  { type: "reengaged", label: "Previous Candidates Re-engaged", cadence: "weekly", goal: 25, accent: "#2f6bff" },
  { type: "new_pipeline", label: "New Candidates to Pipeline", cadence: "weekly", goal: 50, range: "50+", accent: "#18c5e6" },
];

export const ACTIVITIES_DAILY = ACTIVITIES.filter((a) => a.cadence === "daily");
export const ACTIVITIES_WEEKLY = ACTIVITIES.filter((a) => a.cadence === "weekly");

/** Goals for metrics pulled from real CRM data (submittals, interviews, hires). */
export const GOALS = {
  submissionsWeekly: { goal: 10, range: "10–12" },
  interviewsWeekly: { goal: 8, range: "8–10" },
  hiresWeekly: { goal: 2, range: "2–3" },
  hiresMonthly: { goal: 10, range: "10–12" },
  engSubmissionsWeekly: { goal: 3, range: "3–5" },
  engPlacementsMonthly: { goal: 2, range: "2" },
};

/** A submittal / candidate role counts as engineering. */
export function isEngineeringRole(role: string | null | undefined): boolean {
  return /engineer|\beng\b|\bmfg\b/i.test(role ?? "");
}
