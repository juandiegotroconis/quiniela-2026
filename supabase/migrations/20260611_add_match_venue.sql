-- Stadium/venue info for each match, sourced from the FIFA World Cup 2026 schedule.
-- venue_country references teams.code (USA/MEX/CAN) so the host country's flag can be shown.
alter table public.matches
  add column if not exists venue text,
  add column if not exists venue_country text references public.teams(code);
