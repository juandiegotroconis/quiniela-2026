-- Moves the knockout prediction write-gate off `quinielas.is_updatable` and
-- onto the knockout_mode + stage deadline (the first kickoff of the relevant
-- stage). is_updatable still governs GROUP_STAGE writes only.
--
-- is_prediction_open(match, quiniela):
--   GROUP_STAGE  -> quinielas.is_updatable (unchanged legacy behavior)
--   knockout     -> Round of 32 must be fully resolved, then:
--                     ONE_SHOT       open until the first Round-of-32 kickoff
--                                    (one deadline for the whole bracket)
--                     STAGE_BY_STAGE open until this stage's first kickoff,
--                                    and only while it's the current stage
--                                    (every earlier knockout stage finished)
-- Mirrors the frontend gating in helpers.ts (getKnockoutEntryDeadline /
-- isPredictionStageLocked / getCurrentKnockoutStage).

create or replace function public.is_prediction_open(
  p_match_id integer,
  p_quiniela_id uuid
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_stage text;
  v_mode text;
  v_deadline timestamptz;
  v_order text[] := array['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
begin
  select stage into v_stage from matches where id = p_match_id;
  if v_stage is null then
    return false;
  end if;

  -- Group stage keeps the legacy is_updatable gate.
  if v_stage = 'GROUP_STAGE' then
    return coalesce((select is_updatable from quinielas where id = p_quiniela_id), false);
  end if;

  -- Knockout entry never opens until the entire Round of 32 is resolved.
  if exists (
    select 1 from matches
    where stage = 'LAST_32' and (home_team_code is null or away_team_code is null)
  ) then
    return false;
  end if;

  select knockout_mode into v_mode from quinielas where id = p_quiniela_id;

  if v_mode = 'ONE_SHOT' then
    select min(utc_date) into v_deadline from matches where stage = 'LAST_32';
    return v_deadline is not null and now() < v_deadline;
  end if;

  -- STAGE_BY_STAGE: this match's stage must be fully resolved, the current
  -- open stage (every earlier knockout stage finished), and before its own
  -- first kickoff.
  if exists (
    select 1 from matches
    where stage = v_stage and (home_team_code is null or away_team_code is null)
  ) then
    return false;
  end if;

  if exists (
    select 1 from matches m2
    where m2.stage <> 'GROUP_STAGE'
      and array_position(v_order, m2.stage) < array_position(v_order, v_stage)
      and m2.status <> 'FINISHED'
  ) then
    return false;
  end if;

  select min(utc_date) into v_deadline from matches where stage = v_stage;
  return v_deadline is not null and now() < v_deadline;
end;
$$;

grant execute on function public.is_prediction_open(integer, uuid) to authenticated, anon;

-- Re-point the prediction / bracket write-checks at is_prediction_open.
alter policy predictions_write_when_updatable on public.predictions
  with check (user_id = auth.uid() and public.is_prediction_open(match_id, quiniela_id));

alter policy bracket_predictions_insert_own on public.bracket_predictions
  with check (user_id = auth.uid() and public.is_prediction_open(match_id, quiniela_id));

alter policy bracket_predictions_update_own on public.bracket_predictions
  with check (user_id = auth.uid() and public.is_prediction_open(match_id, quiniela_id));

-- top_scorer_predictions is a tournament-level pick with no match — it keeps
-- the is_updatable gate (top_scorer_write_when_updatable), unchanged.
