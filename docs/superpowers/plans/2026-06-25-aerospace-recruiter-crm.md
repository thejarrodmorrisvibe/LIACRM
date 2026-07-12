# Aerospace Recruiter CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, polished, online CRM + task manager for one aerospace recruiter, covering a candidate pipeline, active roster, job openings, tasks, brain dump, and quarterly commission estimates, reachable from PC and phone.

**Architecture:** Next.js (App Router, TypeScript) frontend and server actions, Supabase for Postgres + email/password auth + Row-Level Security, deployed on Vercel. One shared candidate + job database; Active Roster and Commissions are derived views of the candidate data. UI is commercial-grade SaaS: aerospace navy/cyan palette, sidebar shell, KPI dashboards, kanban pipeline, fully responsive.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vercel. Node via portable install at `TEST1/.node`. Tests with Vitest for pure logic (commission calc).

---

## File Structure

```
recruiter-crm/
  app/
    layout.tsx                      # root layout, fonts, globals
    globals.css                     # Tailwind + design tokens (CSS vars)
    login/page.tsx                  # email/password sign-in
    (app)/layout.tsx                # authed shell: sidebar + top bar, auth guard
    (app)/page.tsx                  # redirect → /roster (home dashboard)
    (app)/pipeline/page.tsx         # kanban board
    (app)/roster/page.tsx           # active roster dashboard
    (app)/jobs/page.tsx             # job openings / hot jobs
    (app)/tasks/page.tsx            # master task list
    (app)/braindump/page.tsx        # end-of-day brain dump
    (app)/commissions/page.tsx      # quarterly commission tracker
  components/
    ui/                             # Button, Input, Select, Modal, Badge, Card, Toast, StatCard
    layout/Sidebar.tsx, TopBar.tsx
    candidates/CandidateCard.tsx, CandidateDetail.tsx, PipelineBoard.tsx
    jobs/JobRow.tsx, JobForm.tsx
    tasks/TaskList.tsx, TaskRow.tsx
  lib/
    supabase/client.ts              # browser client
    supabase/server.ts              # server client (cookies)
    types.ts                        # Candidate, Job, Task, BrainDump, Stage enum
    commission.ts                   # pure commission math (unit-tested)
    actions/                        # server actions per entity (candidates, jobs, tasks, braindumps)
  supabase/schema.sql               # tables, enums, RLS policies
  middleware.ts                     # refresh session, protect (app) routes
  .env.local                        # Supabase URL + anon key (not committed)
  lib/commission.test.ts            # Vitest unit tests for commission.ts
```

---

## Phase 0: Project Scaffold

### Task 0: Initialize Next.js + Tailwind project

**Files:**
- Create: whole `recruiter-crm/` Next.js scaffold, `.gitignore`, `tailwind.config`, `app/globals.css`

- [ ] **Step 1:** From `TEST1`, scaffold with the portable Node. Run:
  `./.node/npx create-next-app@latest recruiter-crm --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack`
- [ ] **Step 2:** `git init` in `recruiter-crm`, confirm `.gitignore` includes `.env*.local`, `node_modules`, `.next`.
- [ ] **Step 3:** Install deps: `./.node/npm install @supabase/supabase-js @supabase/ssr` and `./.node/npm install -D vitest`.
- [ ] **Step 4:** Add `"test": "vitest run"` to `package.json` scripts.
- [ ] **Step 5:** Run `./.node/npm run dev`, confirm the starter page loads at `localhost:3000`.
- [ ] **Step 6:** Commit: `chore: scaffold next.js + tailwind + supabase deps`.

---

## Phase 1: Supabase Backend

### Task 1: Create Supabase project & schema

**Files:**
- Create: `supabase/schema.sql`, `.env.local`

- [ ] **Step 1:** Create a Supabase project (via Supabase MCP/dashboard). Capture project URL + anon key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Step 2:** Write `supabase/schema.sql` defining: a `stage` enum (New, Submitted, Interviewing, Offer Extended, Offer Accepted, Onboarding, Started, Inactive); `pay_type` enum (hourly, salary); `job_status` enum (Open, Filled, On Hold); and the four tables (`candidates`, `jobs`, `tasks`, `braindumps`) with all columns from the spec, plus `owner_id uuid references auth.users default auth.uid()`.
- [ ] **Step 3:** Add RLS: enable on all tables; policy `owner_id = auth.uid()` for select/insert/update/delete on each.
- [ ] **Step 4:** Run the SQL against the project (MCP `apply_migration` or SQL editor). Verify tables exist.
- [ ] **Step 5:** Create the single owner user (Supabase Auth → add user with owner's email + a password).
- [ ] **Step 6:** Commit schema: `feat: supabase schema + RLS`.

### Task 2: Supabase clients + auth middleware

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`, `lib/types.ts`

- [ ] **Step 1:** `client.ts`: `createBrowserClient` from `@supabase/ssr` using the public env vars.
- [ ] **Step 2:** `server.ts`: `createServerClient` wired to Next cookies for server actions/components.
- [ ] **Step 3:** `middleware.ts`: refresh the session and redirect unauthenticated requests for `(app)` routes to `/login`.
- [ ] **Step 4:** `types.ts`: TS interfaces `Candidate`, `Job`, `Task`, `BrainDump` and `Stage`/`PayType`/`JobStatus` union types matching the schema exactly.
- [ ] **Step 5:** Commit: `feat: supabase clients, middleware, shared types`.

---

## Phase 2: Design System + App Shell

### Task 3: Design tokens & UI primitives

**Files:**
- Modify: `app/globals.css` (CSS variables for palette, radii, shadows; import Inter)
- Create: `components/ui/{Button,Input,Select,Textarea,Modal,Badge,Card,StatCard,Toast}.tsx`

- [ ] **Step 1:** In `globals.css` define CSS variables — base navy/slate surfaces, electric-blue `--accent`, cyan `--accent-2`, status colors `--ok` (emerald), `--warn` (amber), `--bad` (red); radius + shadow tokens. Load Inter via `next/font`.
- [ ] **Step 2:** Build each UI primitive as a small, reusable, typed component using the tokens (consistent padding, hover/focus transitions, rounded corners, soft shadows). `Badge` supports status color variants; `StatCard` shows a label, big number, and optional sub-text.
- [ ] **Step 3:** Use the `frontend-design` skill to keep these distinctive and production-grade (not generic).
- [ ] **Step 4:** Commit: `feat: design tokens + UI primitive library`.

### Task 4: App shell (sidebar, top bar, auth guard) + login

**Files:**
- Create: `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/login/page.tsx`

- [ ] **Step 1:** `Sidebar`: left nav linking the six sections with icons + active state; collapses to a hamburger/bottom nav on small screens.
- [ ] **Step 2:** `TopBar`: app title + a live "This Quarter" commission KPI slot + sign-out button.
- [ ] **Step 3:** `(app)/layout.tsx`: server-check the session (redirect to `/login` if absent), render Sidebar + TopBar around `{children}`.
- [ ] **Step 4:** `(app)/page.tsx`: redirect to `/roster`.
- [ ] **Step 5:** `login/page.tsx`: branded email/password form calling `signInWithPassword`, redirect to `/roster` on success, friendly error on failure.
- [ ] **Step 6:** Verify: signed-out users hitting `/roster` bounce to `/login`; logging in lands on the shell. Commit: `feat: app shell + login`.

---

## Phase 3: Server Actions (data layer)

### Task 5: CRUD server actions per entity

**Files:**
- Create: `lib/actions/candidates.ts`, `lib/actions/jobs.ts`, `lib/actions/tasks.ts`, `lib/actions/braindumps.ts`

- [ ] **Step 1:** `candidates.ts`: `listCandidates`, `getCandidate`, `createCandidate`, `updateCandidate` (covers stage change, compliance toggles, dates, job link, notes), `deleteCandidate`. Each uses the server Supabase client; `revalidatePath` after writes.
- [ ] **Step 2:** `jobs.ts`: list/create/update/delete + `toggleHot`; `listCandidatesForJob(jobId)`.
- [ ] **Step 3:** `tasks.ts`: list (with filters today/overdue/all/by-candidate), create, toggleDone, update, delete.
- [ ] **Step 4:** `braindumps.ts`: `saveBrainDump(date, text)`, `listBrainDumps`, `promoteLineToTask(text, candidateId?)`.
- [ ] **Step 5:** Commit: `feat: server actions for candidates, jobs, tasks, braindumps`.

---

## Phase 4: Commission Logic (TDD)

### Task 6: Pure commission calculator with tests

**Files:**
- Create: `lib/commission.ts`, `lib/commission.test.ts`

- [ ] **Step 1: Write failing tests** in `commission.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { weeksWorked, candidateCommission, quarterOf, rollupByQuarter } from './commission'

const RATE = 0.25, HOURS = 40 // $10/week

describe('weeksWorked', () => {
  it('is 0 before start', () => {
    expect(weeksWorked('2026-07-01', null, new Date('2026-06-01'))).toBe(0)
  })
  it('counts full weeks to today when ongoing', () => {
    expect(weeksWorked('2026-06-01', null, new Date('2026-06-29'))).toBeCloseTo(4, 5)
  })
  it('stops at end_date when set', () => {
    expect(weeksWorked('2026-06-01', '2026-06-15', new Date('2026-06-29'))).toBeCloseTo(2, 5)
  })
})

describe('candidateCommission', () => {
  it('is $10 per full week', () => {
    expect(candidateCommission('2026-06-01', null, new Date('2026-06-29'))).toBeCloseTo(40, 5)
  })
})

describe('quarter rollup', () => {
  it('labels quarters', () => {
    expect(quarterOf(new Date('2026-02-10'))).toBe('2026-Q1')
    expect(quarterOf(new Date('2026-11-10'))).toBe('2026-Q4')
  })
})
```

- [ ] **Step 2:** Run `./.node/npm test` — expect FAIL (functions undefined).
- [ ] **Step 3: Implement `commission.ts`:**

```ts
const RATE = 0.25
const WEEKLY_HOURS = 40
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function weeksWorked(start: string, end: string | null, now: Date): number {
  const startMs = new Date(start).getTime()
  const endMs = end ? Math.min(new Date(end).getTime(), now.getTime()) : now.getTime()
  if (endMs <= startMs) return 0
  return (endMs - startMs) / MS_PER_WEEK
}

export function candidateCommission(start: string, end: string | null, now: Date): number {
  return weeksWorked(start, end, now) * WEEKLY_HOURS * RATE
}

export function quarterOf(d: Date): string {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
}

// rollupByQuarter: distribute each candidate's earnings into the quarters they span.
export function rollupByQuarter(
  cands: { start: string; end: string | null }[],
  now: Date
): Record<string, number> { /* sum candidateCommission per quarter bucket */ }
```

Implement `rollupByQuarter` to walk each candidate's active interval week-by-week (or quarter-boundary math) and add `WEEKLY_HOURS * RATE` to the matching `quarterOf` bucket.

- [ ] **Step 4:** Run `./.node/npm test` — expect PASS.
- [ ] **Step 5:** Commit: `feat: commission calculator (tested)`.

---

## Phase 5: The Six Sections

### Task 7: Job Openings / Hot Jobs

**Files:**
- Create: `app/(app)/jobs/page.tsx`, `components/jobs/JobForm.tsx`, `components/jobs/JobRow.tsx`

- [ ] **Step 1:** Page lists jobs via `listJobs`, hot jobs pinned/sorted to top with a filled star; toggle star calls `toggleHot`.
- [ ] **Step 2:** Each row shows client, position, pay formatted by `pay_type` ($X/hr or $X/yr), location, status badge.
- [ ] **Step 3:** "Add Job" opens `JobForm` modal (create/edit) with all fields; delete with confirm.
- [ ] **Step 4:** Job detail/expander shows linked candidates from `listCandidatesForJob`.
- [ ] **Step 5:** Verify create/edit/star/delete in the browser. Commit: `feat: job openings section`.

### Task 8: Pipeline kanban + candidate detail

**Files:**
- Create: `app/(app)/pipeline/page.tsx`, `components/candidates/PipelineBoard.tsx`, `CandidateCard.tsx`, `CandidateDetail.tsx`

- [ ] **Step 1:** `PipelineBoard`: one colored column per stage; candidate cards show name, client/role, compliance pills (drug/background/offer).
- [ ] **Step 2:** Cards open `CandidateDetail` modal: edit all fields, toggle compliance, set start/end dates, link a job (select from jobs), edit notes, change stage.
- [ ] **Step 3:** Move stage via dropdown in detail and via drag-and-drop between columns (drag optional-but-preferred; dropdown is the reliable fallback).
- [ ] **Step 4:** "Add Candidate" creates a card in New.
- [ ] **Step 5:** Verify full lifecycle (create → move → check compliance → set start date). Commit: `feat: pipeline kanban + candidate detail`.

### Task 9: Active Roster dashboard

**Files:**
- Create: `app/(app)/roster/page.tsx`

- [ ] **Step 1:** Query candidates where `stage = 'Started'` and (`end_date` null or future).
- [ ] **Step 2:** Header KPI StatCards: active headcount, total commission this quarter (from `rollupByQuarter` for current quarter), open jobs count.
- [ ] **Step 3:** Table/cards: name, client_company, role, start_date, weeks worked (`weeksWorked`), commission-to-date (`candidateCommission`). Rows link to the candidate detail.
- [ ] **Step 4:** Wire the TopBar "This Quarter" KPI to the same current-quarter total.
- [ ] **Step 5:** Verify a Started candidate appears with correct numbers; Inactive drops off. Commit: `feat: active roster dashboard`.

### Task 10: Commissions tracker

**Files:**
- Create: `app/(app)/commissions/page.tsx`

- [ ] **Step 1:** Per-candidate table: name, start/end, weeks worked, commission-to-date.
- [ ] **Step 2:** Quarterly summary from `rollupByQuarter`: a bar/progress visual per quarter + current-quarter projected total StatCard.
- [ ] **Step 3:** Clear "ballpark, based on a flat 40-hour week" disclaimer.
- [ ] **Step 4:** Verify totals reconcile with the Roster KPI. Commit: `feat: commissions tracker`.

### Task 11: Tasks master list

**Files:**
- Create: `app/(app)/tasks/page.tsx`, `components/tasks/TaskList.tsx`, `TaskRow.tsx`

- [ ] **Step 1:** List tasks with filter tabs: Today, Overdue, All, By Candidate.
- [ ] **Step 2:** Add task (title, due date, priority, optional candidate link); toggle done (strikethrough + `completed_at`); edit/delete.
- [ ] **Step 3:** Priority shown as colored badge; overdue dates highlighted red.
- [ ] **Step 4:** Verify filters and completion. Commit: `feat: tasks master list`.

### Task 12: Brain Dump → Tomorrow

**Files:**
- Create: `app/(app)/braindump/page.tsx`

- [ ] **Step 1:** Big textarea to dump the day's notes; Save stores a `braindumps` row for today and shows a running log of past entries by date.
- [ ] **Step 2:** Each line in the current dump has a "→ Task" action that calls `promoteLineToTask` (optionally linking a candidate), creating a task that then lives in the Tasks list and carries forward until done.
- [ ] **Step 3:** Explain the carry-forward: unfinished tasks always surface under Tasks → Today/Overdue.
- [ ] **Step 4:** Verify dump save + promote-to-task. Commit: `feat: brain dump with promote-to-task`.

---

## Phase 6: Polish & Deploy

### Task 13: Responsive + UX polish pass

**Files:** touch components/pages as needed

- [ ] **Step 1:** Verify every section on a phone-width viewport: sidebar collapses, cards stack, tables scroll, tap targets comfortable.
- [ ] **Step 2:** Add loading skeletons, empty states with friendly prompts, and success/error toasts on writes.
- [ ] **Step 3:** Check color contrast/focus states; confirm no generic unstyled areas; confirm copy uses no em dashes.
- [ ] **Step 4:** Commit: `polish: responsive + UX pass`.

### Task 14: Deploy to Vercel

**Files:** Vercel project settings

- [ ] **Step 1:** Push the repo to a new private GitHub repo.
- [ ] **Step 2:** Create a Vercel project from it; add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars.
- [ ] **Step 3:** Deploy; open the production URL, log in, confirm data loads on PC and phone.
- [ ] **Step 4:** Add Supabase redirect/site URL for the Vercel domain if needed.
- [ ] **Step 5:** Give the owner the bookmarkable URL + login. Commit any config: `chore: vercel deploy config`.

---

## Self-Review Notes

- **Spec coverage:** Pipeline (T8), Active Roster (T9), Job Openings (T7), Tasks (T11), Brain Dump (T12), Commissions (T6+T10), auth/RLS (T1–T2), UI/UX requirement (T3–T4, T13), responsive + deploy (T13–T14). All spec sections mapped.
- **Derived views:** Roster and Commissions both consume `candidates` + `commission.ts` — no double entry, consistent with spec.
- **Types:** `Stage`, `PayType`, `JobStatus` defined once in `types.ts` and reused; commission functions share one signature `(start, end, now)`.
