-- Full job description (the client's verbatim JD: overview, responsibilities,
-- preferred quals, clearance). `requirements` stays the short must-have list
-- that renders as the 2-line preview under each role in the Jobs table.
alter table public.jobs add column if not exists description text;
