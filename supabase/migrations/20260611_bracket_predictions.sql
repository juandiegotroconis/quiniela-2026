-- Bracket predictions: for each knockout-stage match (a "slot" in the bracket),
-- a user predicts which two teams will play in it. Used by the "matchup bonus"
-- (RULES_MATCHUP_*): +2 if both predicted teams are correct, +1 if one is, only
-- when the main match-result prediction scored 0 points.
--
-- Prerequisite (not part of this migration): the 32 knockout-stage rows must
-- exist in `matches` (seeded from football-data.org, stage in
-- ROUND_OF_32 / ROUND_OF_16 / QUARTER_FINALS / SEMI_FINALS / THIRD_PLACE / FINAL),
-- so `match_id` below has a real row to reference.

create table if not exists public.bracket_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiniela_id uuid not null references public.quinielas(id) on delete cascade,
  match_id int not null references public.matches(id) on delete cascade,
  pred_home_team_code text references public.teams(code),
  pred_away_team_code text references public.teams(code),
  updated_at timestamptz not null default now(),
  unique (user_id, quiniela_id, match_id),
  check (pred_home_team_code is null or pred_away_team_code is null or pred_home_team_code <> pred_away_team_code)
);

alter table public.bracket_predictions enable row level security;

-- Members can read bracket predictions within their own quiniela.
create policy "bracket_predictions_select_own_quiniela"
  on public.bracket_predictions for select
  using (quiniela_id in (select get_my_quiniela_ids()));

-- Writes only while the quiniela is updatable, same gate as `predictions`.
create policy "bracket_predictions_insert_own"
  on public.bracket_predictions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.quinielas q
      where q.id = quiniela_id and q.is_updatable
    )
  );

create policy "bracket_predictions_update_own"
  on public.bracket_predictions for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.quinielas q
      where q.id = quiniela_id and q.is_updatable
    )
  );
