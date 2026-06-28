-- Per-quiniela knockout prediction mode:
--   ONE_SHOT       - members predict every knockout match up front (Round of
--                    32 onward), guessing future-round matchups via
--                    bracket_predictions until those teams are decided.
--   STAGE_BY_STAGE - only the current round is open for predictions; the
--                    next round opens once every match in the current one
--                    has finished and its teams have resolved. No bracket
--                    guessing — a stage is never shown until its teams are
--                    already known.
-- Purely a frontend gating concern (PredictionEntryForm) — scoring already
-- only awards the bracket matchup bonus when a bracket_predictions row
-- exists, so STAGE_BY_STAGE quinielas (which never write one) are
-- unaffected by 20260628_fix_knockout_scoring.sql.
--
-- Defaults to STAGE_BY_STAGE for new quinielas. Existing quinielas (incl. the
-- production default) keep that default until an admin sets it explicitly
-- per tournament — not assumed here.

alter table public.quinielas
  add column if not exists knockout_mode text not null default 'STAGE_BY_STAGE'
  check (knockout_mode in ('ONE_SHOT', 'STAGE_BY_STAGE'));

-- Re-create the 3 membership RPCs (full bodies from 20260623_active_quiniela.sql)
-- with knockout_mode added to their return shape, alongside the existing
-- variant column.

create or replace function public.get_active_membership()
returns table (quiniela_id uuid, avatar_color text, is_updatable boolean, variant text, knockout_mode text)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
  v_active_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select pr.active_quiniela_id into v_active_id
  from public.profiles pr
  where pr.id = v_user_id;

  if v_active_id is null or not exists (
    select 1 from public.quiniela_members m
    where m.user_id = v_user_id and m.quiniela_id = v_active_id
  ) then
    select m.quiniela_id into v_active_id
    from public.quiniela_members m
    where m.user_id = v_user_id
    order by m.id
    limit 1;

    if v_active_id is not null then
      update public.profiles set active_quiniela_id = v_active_id where id = v_user_id;
    end if;
  end if;

  if v_active_id is null then
    return;
  end if;

  return query
  select m.quiniela_id, m.avatar_color, q.is_updatable, q.variant, q.knockout_mode
  from public.quiniela_members m
  join public.quinielas q on q.id = m.quiniela_id
  where m.user_id = v_user_id and m.quiniela_id = v_active_id;
end;
$$;

grant execute on function public.get_active_membership() to authenticated;

create or replace function public.set_active_quiniela(p_quiniela_id uuid)
returns table (quiniela_id uuid, avatar_color text, is_updatable boolean, variant text, knockout_mode text)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.quiniela_members m
    where m.user_id = v_user_id and m.quiniela_id = p_quiniela_id
  ) then
    raise exception 'Not a member of this quiniela';
  end if;

  update public.profiles set active_quiniela_id = p_quiniela_id where id = v_user_id;

  return query
  select m.quiniela_id, m.avatar_color, q.is_updatable, q.variant, q.knockout_mode
  from public.quiniela_members m
  join public.quinielas q on q.id = m.quiniela_id
  where m.user_id = v_user_id and m.quiniela_id = p_quiniela_id;
end;
$$;

grant execute on function public.set_active_quiniela(uuid) to authenticated;

create or replace function public.join_quiniela_by_code(p_join_code character)
returns table(quiniela_id uuid, is_updatable boolean, variant text, knockout_mode text)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;

  v_quiniela_id uuid;
  v_is_updatable boolean;
  v_variant public.quinielas.variant%type;
  v_knockout_mode public.quinielas.knockout_mode%type;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select pr.display_name
    into v_display_name
  from public.profiles pr
  where pr.id = v_user_id;

  if v_display_name is null then
    raise exception 'Profile not found';
  end if;

  -- Resolve quiniela
  select q.id, q.is_updatable, q.variant, q.knockout_mode
    into v_quiniela_id, v_is_updatable, v_variant, v_knockout_mode
  from public.quinielas q
  where q.join_code = p_join_code
    and coalesce(q.is_active, true) = true;

  if v_quiniela_id is null then
    raise exception 'Invalid join code';
  end if;

  -- Insert membership if missing
  if not exists (
    select 1
    from public.quiniela_members m
    where m.quiniela_id = v_quiniela_id
      and m.user_id = v_user_id
  ) then
    insert into public.quiniela_members (quiniela_id, user_id, display_name)
    values (v_quiniela_id, v_user_id, v_display_name);
  end if;

  update public.profiles set active_quiniela_id = v_quiniela_id where id = v_user_id;

  -- Set output columns
  quiniela_id := v_quiniela_id;
  is_updatable := v_is_updatable;
  variant := v_variant;
  knockout_mode := v_knockout_mode;

  return next;
end;
$$;

grant execute on function public.join_quiniela_by_code(character) to authenticated;
