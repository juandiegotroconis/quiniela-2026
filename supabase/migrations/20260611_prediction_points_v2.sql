-- Draft scoring functions implementing the rules in RulesModal.tsx /
-- src/lib/scoring.ts (RULES_GROUP_*, RULES_KNOCKOUT_*, RULES_MATCHUP_*).
--
-- These are additive (new function names) rather than `CREATE OR REPLACE`
-- on the existing `prediction_points`/`refresh_quiniela_leaderboard`, since
-- their current bodies weren't available to diff against in this session.
--
-- Before wiring these into `refresh_quiniela_leaderboard`:
--   1. Compare `prediction_points_v2` against the existing `prediction_points`
--      to confirm group-stage results (5/3/0) are unchanged.
--   2. In `refresh_quiniela_leaderboard`, when `prediction_points_v2` returns 0
--      for a knockout-stage match, look up the user's `bracket_predictions` row
--      for that match_id and add `bracket_bonus_points(...)` instead.

create or replace function public.prediction_points_v2(
  p_stage text,
  p_score_home_regular int,
  p_score_away_regular int,
  p_score_home_et int,
  p_score_away_et int,
  p_winner text,
  p_pick_home int,
  p_pick_away int,
  p_pick_penalties_winner text
) returns int
language plpgsql
immutable
set search_path = ''
as $$
declare
  final_home int;
  final_away int;
begin
  if p_stage = 'GROUP_STAGE' then
    if p_score_home_regular is null or p_score_away_regular is null then
      return null;
    end if;

    if p_pick_home = p_score_home_regular and p_pick_away = p_score_away_regular then
      return 5;
    end if;

    if sign(p_pick_home - p_pick_away) = sign(p_score_home_regular - p_score_away_regular) then
      return 3;
    end if;

    return 0;
  end if;

  -- Knockout: final score is the ET score if the match went to extra time,
  -- otherwise the regular-time score.
  final_home := coalesce(p_score_home_et, p_score_home_regular);
  final_away := coalesce(p_score_away_et, p_score_away_regular);

  if final_home is null or final_away is null then
    return null;
  end if;

  if final_home <> final_away then
    if p_pick_home = final_home and p_pick_away = final_away then
      return 5;
    end if;

    if sign(p_pick_home - p_pick_away) = sign(final_home - final_away) then
      return 3;
    end if;

    return 0;
  end if;

  -- Draw after ET — decided on penalties.
  if p_pick_home = final_home and p_pick_away = final_away then
    if p_pick_penalties_winner = p_winner then
      return 5;
    end if;
    return 4;
  end if;

  if p_pick_home = p_pick_away then
    return 3;
  end if;

  return 0;
end;
$$;

-- Matchup bonus (RULES_MATCHUP_*): only applied when prediction_points_v2 = 0
-- for a knockout match. Compares the user's predicted bracket matchup
-- (bracket_predictions.pred_home_team_code/pred_away_team_code) against the
-- actual two teams that played in this slot.
create or replace function public.bracket_bonus_points(
  p_pred_home_team_code text,
  p_pred_away_team_code text,
  p_actual_home_team_code text,
  p_actual_away_team_code text
) returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when (p_pred_home_team_code in (p_actual_home_team_code, p_actual_away_team_code))::int
       + (p_pred_away_team_code in (p_actual_home_team_code, p_actual_away_team_code))::int >= 2
      then 2
    when (p_pred_home_team_code in (p_actual_home_team_code, p_actual_away_team_code))::int
       + (p_pred_away_team_code in (p_actual_home_team_code, p_actual_away_team_code))::int = 1
      then 1
    else 0
  end;
$$;
