-- Outreach tagging: attribute a logged activity to a client and/or job opening.
-- Run in the Supabase SQL editor. Safe to re-run (idempotent).

alter table activities add column if not exists client_name text;
alter table activities add column if not exists job_id uuid references jobs(id) on delete set null;
alter table activities add column if not exists job_label text;

create index if not exists activities_type_idx on activities (type);
create index if not exists activities_job_id_idx on activities (job_id);
