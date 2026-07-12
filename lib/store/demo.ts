import type { BrainDump, Candidate, Job, Task, Submittal, Referral, Interview, Activity } from "@/lib/types";

/* In-memory store used until Supabase is connected. Cached on globalThis so it
   survives dev hot-reloads and persists across requests in one session.

   Ships EMPTY so the CRM starts as a blank slate — add your own candidates,
   jobs, submittals, and tasks. (Once Supabase is connected, this store is
   bypassed entirely and everything reads/writes from your database.) */

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
}

export interface DemoStore {
  candidates: Candidate[];
  jobs: Job[];
  tasks: Task[];
  braindumps: BrainDump[];
  submittals: Submittal[];
  referrals: Referral[];
  interviews: Interview[];
  activities: Activity[];
}

function seed(): DemoStore {
  return {
    candidates: [],
    jobs: [],
    tasks: [],
    braindumps: [],
    submittals: [],
    referrals: [],
    interviews: [],
    activities: [],
  };
}

const g = globalThis as unknown as { __apexDemo?: DemoStore };
export const demo: DemoStore = g.__apexDemo ?? (g.__apexDemo = seed());
