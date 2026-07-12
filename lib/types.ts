import type { Tone } from "@/components/ui/Badge";

/* ---------- Enums / unions (must match supabase/schema.sql) ---------- */

export type Stage =
  | "New"
  | "Submitted"
  | "Interviewing"
  | "Offer Extended"
  | "Offer Accepted"
  | "Tracking"
  | "Started"
  | "Inactive"
  | "Position Closed";

export type PayType = "hourly" | "salary";
export type JobStatus = "Open" | "Filled" | "On Hold";
export type Priority = "Low" | "Medium" | "High";

/* ---------- Row shapes ---------- */

export interface Candidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  client_company: string | null;
  pay_rate: number | null;
  stage: Stage;
  drug_tested: boolean;
  background_cleared: boolean;
  offer_accepted: boolean;
  start_date: string | null; // yyyy-mm-dd
  end_date: string | null; // yyyy-mm-dd, null = ongoing
  job_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  client_name: string;
  position_title: string;
  pay_type: PayType;
  pay_amount: number | null; // legacy single value; prefer pay_min/pay_max
  pay_min: number | null;
  pay_max: number | null;
  location: string | null;
  job_type: string | null; // contract / direct hire / contract-to-hire
  status: JobStatus;
  is_hot: boolean;
  description: string | null; // full verbatim JD from the client (overview, duties, preferred quals, clearance)
  requirements: string | null; // what the role needs (experience, tools, license)
  client_note: string | null; // general info about the client (shown once per group)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: Priority;
  done: boolean;
  candidate_id: string | null;
  source: "manual" | "braindump";
  created_at: string;
  completed_at: string | null;
}

export interface BrainDump {
  id: string;
  entry_date: string; // yyyy-mm-dd
  raw_text: string;
  created_at: string;
}

export interface Activity {
  id: string;
  type: string;   // matches ACTIVITIES[].type in lib/kpi.ts
  amount: number; // 1 for counts, minutes for sourcing time
  occurred_at: string; // ISO timestamp
  notes: string | null;
  client_name?: string | null; // optional tag: which client this activity was for
  job_id?: string | null;      // optional tag: which job opening
  job_label?: string | null;   // snapshot of the job title (survives job deletion)
}

export type InterviewType = "Phone" | "Video" | "In-person";
export type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "No-show";

export interface Interview {
  id: string;
  candidate_id: string | null;
  candidate_name: string;
  client_name: string | null;
  position: string | null;
  interview_type: InterviewType;
  scheduled_at: string | null; // ISO timestamp
  location: string | null; // address, phone number, or video link
  status: InterviewStatus;
  notes: string | null;
  created_at: string;
}

export const INTERVIEW_TYPE_TONE: Record<InterviewType, Tone> = {
  Phone: "accent",
  Video: "info",
  "In-person": "ok",
};
export const INTERVIEW_STATUS_TONE: Record<InterviewStatus, Tone> = {
  Scheduled: "accent",
  Completed: "ok",
  Cancelled: "neutral",
  "No-show": "bad",
};

export interface Referral {
  id: string;
  referrer_candidate_id: string | null;
  referrer_name: string; // the candidate who made the referral
  referral_candidate_id: string | null;
  referral_name: string; // the person they referred
  referral_start_date: string | null; // yyyy-mm-dd
  bonus_amount: number;
  bonus_paid: boolean;
  reminder_created: boolean; // payroll heads-up task already generated
  notes: string | null;
  created_at: string;
}

export interface Submittal {
  id: string;
  candidate_id: string | null;
  candidate_name: string; // snapshot — survives candidate deletion
  client_name: string | null;
  position: string | null;
  pay_rate: string | null; // rate submitted at, e.g. "$45/hr" or "45"
  location: string | null;
  submitted_at: string; // yyyy-mm-dd
  notes: string | null;
  created_at: string;
}

/* ---------- Stage display metadata (pipeline columns + badges) ---------- */

export const STAGES: Stage[] = [
  "New",
  "Submitted",
  "Interviewing",
  "Offer Extended",
  "Offer Accepted",
  "Tracking",
  "Started",
  "Inactive",
  "Position Closed",
];

/** Display labels for stages (DB value stays the same; only the wording shown changes). */
export const STAGE_LABEL: Record<Stage, string> = {
  New: "New",
  Submitted: "Submitted · Pending Feedback",
  Interviewing: "Interviewing",
  "Offer Extended": "Offer Extended",
  "Offer Accepted": "Offer Accepted",
  Tracking: "Tracking",
  Started: "Started",
  Inactive: "Inactive",
  "Position Closed": "Position Closed",
};

export const STAGE_META: Record<Stage, { tone: Tone; dot: string; accent: string }> = {
  New: { tone: "neutral", dot: "#9aa7bd", accent: "#9aa7bd" },
  Submitted: { tone: "accent", dot: "#2f6bff", accent: "#2f6bff" },
  Interviewing: { tone: "info", dot: "#6366f1", accent: "#6366f1" },
  "Offer Extended": { tone: "info", dot: "#8b5cf6", accent: "#8b5cf6" },
  "Offer Accepted": { tone: "accent", dot: "#18c5e6", accent: "#18c5e6" },
  Tracking: { tone: "warn", dot: "#f5a524", accent: "#f5a524" },
  Started: { tone: "ok", dot: "#11b886", accent: "#11b886" },
  Inactive: { tone: "neutral", dot: "#b3bdce", accent: "#b3bdce" },
  "Position Closed": { tone: "bad", dot: "#7c8698", accent: "#7c8698" },
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  Low: "neutral",
  Medium: "info",
  High: "bad",
};

export const JOB_STATUS_TONE: Record<JobStatus, Tone> = {
  Open: "ok",
  Filled: "accent",
  "On Hold": "warn",
};

/**
 * Whether a candidate should contribute to commission. Requires a start date,
 * and excludes anyone marked Inactive who never logged an end date — i.e. they
 * went inactive without actually working any hours (a no-show / fell through).
 * An Inactive candidate WITH an end date still counts for the period they worked.
 */
export function accruesCommission(c: Candidate): boolean {
  if (!c.start_date) return false;
  if ((c.stage === "Inactive" || c.stage === "Position Closed") && !c.end_date) return false;
  return true;
}

/** A candidate counts as actively working (on roster, accruing commission). */
export function isActivelyWorking(c: Candidate, now: Date = new Date()): boolean {
  if (c.stage !== "Started" || !c.start_date) return false;
  // Not yet started (future start date) → upcoming, not currently working.
  if (new Date(c.start_date + "T00:00:00").getTime() > now.getTime()) return false;
  if (!c.end_date) return true;
  return new Date(c.end_date + "T00:00:00").getTime() >= now.getTime();
}
