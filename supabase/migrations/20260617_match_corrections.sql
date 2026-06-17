-- Logs a row whenever sync-live-matches corrects an already-FINISHED match's
-- score within its RECHECK_WINDOW_MS grace period (see index.ts and
-- 20260617_finished_match_correction_trigger.sql). The frontend reads this
-- to show a "this result was corrected" banner on the leaderboard for a
-- window after the fact (see fetchRecentMatchCorrections).
create table public.match_corrections (
  id bigint generated always as identity primary key,
  match_id integer not null references public.matches(id) on delete cascade,
  old_score_home integer,
  old_score_away integer,
  new_score_home integer,
  new_score_away integer,
  corrected_at timestamptz not null default now()
);

alter table public.match_corrections enable row level security;

create policy "public read match_corrections"
  on public.match_corrections for select
  using (true);
