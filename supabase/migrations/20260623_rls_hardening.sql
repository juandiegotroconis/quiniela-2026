-- RLS hardening pass (2026-06-23)
-- Closes vulnerabilities found in the policy audit:
--   1. quiniela_members: clients could UPDATE their own score columns (total_pts,
--      rank, exact_count, ...) -> leaderboard tampering. Restrict writable columns
--      to avatar_color/display_name and add a WITH CHECK.
--   2. quinielas: any authenticated user could read every row incl. join_code.
--      Restrict SELECT to the caller's own quinielas; join still works via the
--      SECURITY DEFINER join_quiniela_by_code() RPC.
--   3. prediction_submissions: only a SELECT policy existed, so the submit upsert
--      (INSERT/UPDATE) was blocked by RLS. Add own-row INSERT/UPDATE policies.

-- ---------------------------------------------------------------------------
-- 1. quiniela_members: stop clients writing leaderboard/stat columns
-- ---------------------------------------------------------------------------
-- Stat columns are written only by refresh_quiniela_leaderboard (privileged).
-- Clients only ever change avatar_color / display_name.
revoke update on public.quiniela_members from anon, authenticated;
grant  update (avatar_color, display_name) on public.quiniela_members to authenticated;

-- Tighten the policy: own row only, and enforce it on the new row too.
drop policy if exists "Update info" on public.quiniela_members;
create policy "members update own appearance"
  on public.quiniela_members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. quinielas: don't expose join_code / other quinielas to every user
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated can look up quiniela by code" on public.quinielas;
create policy "members read own quinielas"
  on public.quinielas
  for select
  to authenticated
  using (id in (select get_my_quiniela_ids()));

-- ---------------------------------------------------------------------------
-- 3. prediction_submissions: allow a user to (un)mark their own submission
-- ---------------------------------------------------------------------------
drop policy if exists "submissions_insert_own" on public.prediction_submissions;
create policy "submissions_insert_own"
  on public.prediction_submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "submissions_update_own" on public.prediction_submissions;
create policy "submissions_update_own"
  on public.prediction_submissions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
