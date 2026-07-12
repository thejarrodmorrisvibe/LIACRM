-- Lia's CRM — schema + Row Level Security
-- Run this in the Supabase SQL editor (or via migration) for the owner's project.

-- ---------- Enums ----------
do $$ begin
  create type stage as enum (
    'New','Submitted','Interviewing','Offer Extended',
    'Offer Accepted','Tracking','Started','Inactive','Position Closed'
  );
exception when duplicate_object then null; end $$;
alter type stage add value if not exists 'Position Closed';

do $$ begin
  create type pay_type as enum ('hourly','salary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('Open','Filled','On Hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority as enum ('Low','Medium','High');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_name text not null,
  position_title text not null,
  pay_type pay_type not null default 'hourly',
  pay_amount numeric,
  pay_min numeric,
  pay_max numeric,
  location text,
  job_type text,
  status job_status not null default 'Open',
  is_hot boolean not null default false,
  requirements text,
  client_note text,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  client_company text,
  pay_rate numeric,
  stage stage not null default 'New',
  drug_tested boolean not null default false,
  background_cleared boolean not null default false,
  offer_accepted boolean not null default false,
  start_date date,
  end_date date,
  job_id uuid references jobs(id) on delete set null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  priority priority not null default 'Medium',
  done boolean not null default false,
  candidate_id uuid references candidates(id) on delete set null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists braindumps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  raw_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists submittals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete set null,
  candidate_name text not null,
  client_name text,
  position text,
  pay_rate text,
  location text,
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
  client_name text,
  position text,
  interview_type text not null default 'Phone',
  scheduled_at timestamptz,
  location text,
  status text not null default 'Scheduled',
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_candidates_stage on candidates(owner_id, stage);
create index if not exists idx_interviews_when on interviews(owner_id, scheduled_at);
create index if not exists idx_tasks_done on tasks(owner_id, done);
create index if not exists idx_jobs_hot on jobs(owner_id, is_hot);
create index if not exists idx_submittals_date on submittals(owner_id, submitted_at);

-- ---------- Row Level Security ----------
alter table jobs enable row level security;
alter table candidates enable row level security;
alter table tasks enable row level security;
alter table braindumps enable row level security;
alter table submittals enable row level security;

-- OPEN ACCESS (current): no login required, single shared dataset.
-- To re-lock to per-user login, swap the policy below for the owner-scoped one
-- (commented) and set NEXT_PUBLIC_AUTH_DISABLED=false in the app.
do $$
declare t text;
begin
  foreach t in array array['jobs','candidates','tasks','braindumps','submittals','referrals','interviews'] loop
    execute format('alter table %I alter column owner_id drop not null', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('drop policy if exists open_all on %I', t);
    execute format('create policy open_all on %I for all to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on table %I to anon, authenticated', t);
    -- Re-lock version:
    -- execute format('create policy owner_all on %I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;
