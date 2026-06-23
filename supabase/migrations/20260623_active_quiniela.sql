-- Lets a user belong to multiple quinielas but have exactly one "active" at a
-- time, switchable from settings, instead of needing a separate account per
-- quiniela. quiniela_members/predictions already support multiple
-- memberships per user (unique on quiniela_id+user_id, not on user_id alone)
-- -- this only adds the "which one is active" pointer + RPCs to read/switch it.

alter table public.profiles
  add column active_quiniela_id uuid references public.quinielas(id) on delete set null;

-- Direct writes go through set_active_quiniela() only, so a stale/foreign
-- quiniela id can't be written without membership validation.
revoke update (active_quiniela_id) on public.profiles from authenticated;

-- Resolves the caller's active membership, falling back to any existing
-- membership (and persisting that as active) if active_quiniela_id is unset
-- or points at a quiniela the user is no longer a member of. Returns no rows
-- if the user has no membership at all.
create or replace function public.get_active_membership()
returns table (quiniela_id uuid, avatar_color text, is_updatable boolean, variant text)
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
  select m.quiniela_id, m.avatar_color, q.is_updatable, q.variant
  from public.quiniela_members m
  join public.quinielas q on q.id = m.quiniela_id
  where m.user_id = v_user_id and m.quiniela_id = v_active_id;
end;
$$;

grant execute on function public.get_active_membership() to authenticated;

-- Switches the caller's active quiniela; errors if they aren't a member of it.
create or replace function public.set_active_quiniela(p_quiniela_id uuid)
returns table (quiniela_id uuid, avatar_color text, is_updatable boolean, variant text)
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
  select m.quiniela_id, m.avatar_color, q.is_updatable, q.variant
  from public.quiniela_members m
  join public.quinielas q on q.id = m.quiniela_id
  where m.user_id = v_user_id and m.quiniela_id = p_quiniela_id;
end;
$$;

grant execute on function public.set_active_quiniela(uuid) to authenticated;

-- Joining a new quiniela also makes it active, matching current frontend
-- behavior of switching context to whatever quiniela was just joined.
create or replace function public.join_quiniela_by_code(p_join_code character)
returns table(quiniela_id uuid, is_updatable boolean, variant text)
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
  select q.id, q.is_updatable, q.variant
    into v_quiniela_id, v_is_updatable, v_variant
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

  return next;
end;
$$;
