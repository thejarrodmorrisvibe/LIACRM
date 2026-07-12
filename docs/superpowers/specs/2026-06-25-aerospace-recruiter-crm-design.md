# Aerospace Recruiter CRM — Design Spec

**Date:** 2026-06-25
**Owner:** Lia (aerospace staffing recruiter)
**Status:** Approved design, pre-implementation

## Purpose

A private, personal task-management + CRM system for one recruiter to track
candidates through the hiring pipeline, manage daily tasks, capture end-of-day
brain dumps, track open jobs, monitor who is currently working, and estimate
commission earnings by quarter.

Single user. Accessible from work PC **and** phone via a bookmarked web link.
Only the owner can log in and see the data.

## Tech Stack

- **Next.js** (App Router, TypeScript) — the web app
- **Supabase** — Postgres database + email/password authentication
- **Vercel** — hosting; app reachable at a bookmarkable URL on PC and phone
- **Tailwind CSS** — styling

Rationale: this combination gives secure single-user login, a real database that
syncs instantly across devices, simple relational queries for the commission
math, and a free tier sufficient for one person. The owner already uses Vercel
for another project.

## Data Model

Six sections share **one candidate database** and **one job database**.

### `candidates`
- `id`
- `name`
- `email`, `phone`
- `role` (position they're being placed into)
- `client_company` (where they'd work)
- `pay_rate` (their hourly rate — informational)
- `stage` — one of: New, Submitted, Interviewing, Offer Extended,
  Offer Accepted, Onboarding, Started, Inactive
- `drug_tested` (bool), `background_cleared` (bool), `offer_accepted` (bool)
  — compliance checkboxes
- `start_date` (date, set when they begin work) — drives commission
- `end_date` (date, optional, nullable) — when they stop working; null = ongoing
- `job_id` (nullable FK → jobs) — the open req they're tied to
- `notes` (free text)
- `created_at`, `updated_at`

### `jobs`
- `id`
- `client_name`
- `position_title`
- `pay_type` — "hourly" or "salary"
- `pay_amount` (number; interpreted per pay_type)
- `location`
- `job_type` (contract / perm / contract-to-hire) — optional
- `status` — Open, Filled, On Hold
- `is_hot` (bool) — the "focus on this" star
- `notes`
- `created_at`, `updated_at`

### `tasks`
- `id`
- `title`
- `due_date` (nullable)
- `priority` (Low / Medium / High)
- `done` (bool)
- `candidate_id` (nullable FK → candidates) — optional link
- `source` — "manual" or "braindump"
- `created_at`, `completed_at`

### `braindumps`
- `id`
- `entry_date`
- `raw_text` — the full dump for that day (kept as a running log)
- `created_at`

When a brain-dump line is promoted to a task, a `tasks` row is created with
`source = "braindump"`.

## The Six Sections

### 1. Pipeline (CRM core)
Board view with one column per stage (New → … → Inactive). Candidate cards show
name, client/role, and compliance check status at a glance. Clicking a card
opens a detail panel to view/edit all fields, toggle compliance checkboxes, set
start/end dates, link a job, and edit notes. Stage changed via dropdown (and/or
drag-and-drop).

### 2. Active Roster (dashboard)
Auto-populated list of candidates whose `stage = Started` and `end_date` is null
(or in the future). Each row: name, client_company, role, start_date, weeks
worked so far, commission-to-date. Header KPIs: headcount of active candidates
and total commission accruing for the current quarter. Read-only dashboard
(edits happen on the candidate card). Marking someone Inactive or setting an
end_date removes them and stops commission accrual.

### 3. Job Openings / Hot Jobs
List/table of jobs with client_name, position_title, pay (formatted by
pay_type), location, status, and a toggleable hot star. Hot jobs filter/sort to
the top. Job detail shows linked candidates (those with `job_id` = this job).
Jobs can exist with zero linked candidates. Add/edit/delete jobs.

### 4. Tasks (master list)
All tasks in one place: title, due_date, priority, done checkbox, optional
candidate link. Filters: Today, Overdue, All, by candidate. Completing a task
sets `done = true` and stamps `completed_at`.

### 5. Brain Dump → Tomorrow
A text box to dump everything at end of day, saved as a `braindumps` row (running
log, viewable by date). Each line can be promoted into a `tasks` row. Unfinished
tasks (done = false) naturally carry forward — the Tasks "Today/Overdue" views
surface anything still open, so nothing is lost between days.

### 6. Commissions
Calculation per candidate: `$0.25 × 40 hours × weeks_worked`, where
`weeks_worked` = whole/fractional weeks from `start_date` to `min(today,
end_date)`. Candidates with `stage = Inactive` or a passed `end_date` stop
accruing. Results rolled up **by calendar quarter** (Q1–Q4 of the year), with a
current-quarter projected total. Per-candidate breakdown table plus quarterly
summary.

Note: this is explicitly a **ballpark** based on a flat 40-hour week, not exact
payroll.

## Relationships / Shared State

- A candidate may be linked to one job (`candidates.job_id`).
- A job shows all candidates linked to it.
- A task may be linked to one candidate.
- Active Roster and Commissions are **derived views** of `candidates` — no
  separate data entry. Mark a candidate Started → appears on the Roster and
  begins accruing commission.

## Authentication & Privacy

Single owner account (email/password via Supabase Auth). All tables protected by
Row-Level Security so data is only accessible to the authenticated owner.
Standard private login is the security model; no additional field-level
encryption (sufficient for a single-user personal tool).

## UI / UX — a product worth paying for

This is a first-class requirement, not polish-at-the-end. The app should look and
feel like commercial SaaS the owner would happily pay for.

- **Visual identity:** an aerospace-inspired, professional palette — deep
  navy/slate base with a vivid accent (electric blue / cyan) and supporting
  status colors (emerald = good/cleared, amber = pending, red = blocked/overdue).
  Colorful but not childish; confident and clean.
- **Layout:** persistent left sidebar navigation across the six sections, a top
  bar with the current quarter's commission KPI always visible, and a spacious
  content area. Card-based design with soft shadows, rounded corners, generous
  spacing.
- **Dashboard feel:** the Active Roster and Commissions views lead with big,
  legible KPI stat cards (headcount, $ this quarter, active jobs) and clean
  charts/progress bars — the "at a glance" hit.
- **Pipeline:** a true kanban board with colored stage columns, draggable cards,
  and compliance status shown as small colored pills/checkmarks.
- **Components:** consistent buttons, inputs, modals, badges, and toasts. Subtle
  hover/transition micro-interactions. Empty states with friendly prompts.
- **Responsive:** fully usable on phone — sidebar collapses to a bottom/hamburger
  nav, cards stack, tables become scrollable. Touch-friendly tap targets.
- **Typography:** a clean, modern sans (e.g. Inter) with a clear type scale and
  strong hierarchy.
- **Craft details:** loading skeletons, focus states, accessible contrast, dark
  surface accents. No generic/unstyled "developer default" look anywhere.

The `frontend-design` skill will guide implementation to keep the aesthetic
distinctive and production-grade. Copy throughout avoids em dashes per owner
preference.

## Out of Scope (for now)

- Multiple users / team sharing
- Email or calendar integrations
- Resume/file attachments
- Exact payroll-accurate commission (hours imported from a timesheet)

These can be added later; the design leaves room for them.

## Success Criteria

- Owner can log in from PC and phone and see the same live data.
- A candidate can be created, moved through stages, and have compliance items
  checked off.
- Marking a candidate Started makes them appear on the Active Roster and begin
  accruing commission automatically.
- Jobs can be created, flagged hot, and linked to candidates.
- Tasks and brain dumps work for daily planning with carry-forward.
- Commission view shows a believable quarterly ballpark.
