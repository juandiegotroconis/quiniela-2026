-- Tracks the live match clock from football-data.org (e.g. "45", "90+3").
-- Null when the match hasn't started or has finished.
alter table public.matches
  add column if not exists minute text;
