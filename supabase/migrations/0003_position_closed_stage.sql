-- Add a "Position Closed" pipeline stage (client cancelled/closed the req).
-- Run once in the Supabase SQL editor. Safe to re-run.
alter type stage add value if not exists 'Position Closed';
