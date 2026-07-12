-- ============================================================================
-- Lia's CRM — COMPLETE fresh-install schema (run once, top to bottom)
-- Paste this into the Supabase SQL Editor of a brand-new project and hit Run.
-- Creates every table the app uses + OPEN-ACCESS security (no login required).
-- Starts empty — no data. Safe to re-run (idempotent).
-- ============================================================================

-- ---------- Enums ----------
do $$ begin
  create type stage as enum (
    'New','Submitted','Interviewing','Offer Extended',
    'Offer Accepted','Tracking','Started','Inactive','Position Closed'
  );
exception when duplicate_object then null; end $$;
alter type stage add value if not exists 'Position Closed';

do $$ begin create type pay_type as enum ('hourly','salary'); exception when duplicate_object then null; end $$;
do $$ begin create type job_status as enum ('Open','Filled','On Hold'); exception when duplicate_object then null; end $$;
do $$ begin create type priority as enum ('Low','Medium','High'); exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  client_name text not null,
  position_title text not null,
  pay_type pay_type not null default 'hourly',
  pay_amount numeric, pay_min numeric, pay_max numeric,
  location text, job_type text,
  status job_status not null default 'Open',
  is_hot boolean not null default false,
  description text, requirements text, client_note text, notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null, email text, phone text, role text, client_company text,
  pay_rate numeric,
  stage stage not null default 'New',
  drug_tested boolean not null default false,
  background_cleared boolean not null default false,
  offer_accepted boolean not null default false,
  start_date date, end_date date,
  job_id uuid references jobs(id) on delete set null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  title text not null, due_date date,
  priority priority not null default 'Medium',
  done boolean not null default false,
  candidate_id uuid references candidates(id) on delete set null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists braindumps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  raw_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists submittals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete set null,
  candidate_name text not null,
  client_name text, position text, pay_rate text, location text,
  submitted_at date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  referrer_candidate_id uuid references candidates(id) on delete set null,
  referrer_name text not null,
  referral_candidate_id uuid references candidates(id) on delete set null,
  referral_name text not null,
  referral_start_date date,
  bonus_amount numeric not null default 250,
  bonus_paid boolean not null default false,
  reminder_created boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  candidate_id uuid references candidates(id) on delete set null,
  candidate_name text not null,
  client_name text, position text,
  interview_type text not null default 'Phone',
  scheduled_at timestamptz, location text,
  status text not null default 'Scheduled',
  notes text default '',
  created_at timestamptz not null default now()
);

-- Activity KPI events (outreach, screens, follow-ups, etc.) + optional tags.
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  type text not null,
  amount numeric not null default 1,
  occurred_at timestamptz not null default now(),
  notes text default '',
  client_name text,
  job_id uuid references jobs(id) on delete set null,
  job_label text
);

-- ---------- Indexes ----------
create index if not exists idx_candidates_stage on candidates(stage);
create index if not exists idx_interviews_when on interviews(scheduled_at);
create index if not exists idx_tasks_done on tasks(done);
create index if not exists idx_jobs_hot on jobs(is_hot);
create index if not exists idx_submittals_date on submittals(submitted_at);
create index if not exists activities_type_idx on activities(type);
create index if not exists activities_job_id_idx on activities(job_id);

-- ---------- Open-access security (no login; single shared dataset) ----------
-- To re-lock to per-user login later, replace open_all with an owner-scoped
-- policy and set NEXT_PUBLIC_AUTH_DISABLED=false in the app.
do $$
declare t text;
begin
  foreach t in array array['jobs','candidates','tasks','braindumps','submittals','referrals','interviews','activities'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I alter column owner_id drop not null', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('drop policy if exists open_all on %I', t);
    execute format('create policy open_all on %I for all to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on table %I to anon, authenticated', t);
  end loop;
end $$;
