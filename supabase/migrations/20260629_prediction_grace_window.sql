-- Late-submission grace window.
--
-- Gives specific players a personal, time-limited catch-up window to enter
-- predictions after the normal deadline (quinielas.is_updatable turned off),
-- but only for matches that have NOT kicked off yet. Granted manually by the
-- admin via grant_prediction_grace() in the SQL editor.
--
--   quiniela_members.predictions_grace_until  - per-member deadline (null = none)
--   is_prediction_open(...)                   - gains a grace override
--   grant_prediction_grace(member_id, hours)  - admin-only setter

alter table public.quiniela_members
  add column if not exists predictions_grace_until timestamptz;

-- Re-create is_prediction_open with a grace override layered on top of the
-- existing group/knockout gating (see 20260628_knockout_deadline_rls.sql).
-- A member granted an active grace window may write a prediction for any match
-- that has not kicked off yet, regardless of stage gating. RLS already
-- constrains the row to user_id = auth.uid().
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
  v_kickoff timestamptz;
  v_grace timestamptz;
  v_order text[] := array['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'];
begin
  select stage, utc_date into v_stage, v_kickoff from matches where id = p_match_id;
  if v_stage is null then
    return false;
  end if;

  -- Late-submission grace: an active per-member window unlocks any match that
  -- has not kicked off yet, regardless of stage gating below.
  select predictions_grace_until into v_grace
  from quiniela_members
  where quiniela_id = p_quiniela_id and user_id = auth.uid();
  if v_grace is not null and now() < v_grace
     and v_kickoff is not null and now() < v_kickoff then
    return true;
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

-- Admin-only setter: issue (or clear) a grace window for one member, run from
-- the Supabase SQL editor. Returns the resulting deadline (the "up until X").
--   p_member_id  quiniela_members.id
--   p_hours      window length in hours from now; <= 0 clears the window.
create or replace function public.grant_prediction_grace(
  p_member_id uuid,
  p_hours numeric default 24
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
begin
  v_deadline := case
    when p_hours <= 0 then null
    else now() + make_interval(mins => round(p_hours * 60)::int)
  end;
  update quiniela_members
  set predictions_grace_until = v_deadline
  where id = p_member_id;
  if not found then
    raise exception 'No quiniela_member with id %', p_member_id;
  end if;
  return v_deadline;
end;
$$;

-- Keep it out of client roles — Postgres grants EXECUTE to PUBLIC by default.
-- The SQL editor runs as the table owner / service role and can still call it.
revoke execute on function public.grant_prediction_grace(uuid, numeric) from public;
revoke execute on function public.grant_prediction_grace(uuid, numeric) from authenticated;
revoke execute on function public.grant_prediction_grace(uuid, numeric) from anon;
