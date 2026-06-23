-- Golden Boot leaderboard, synced from FIFA's gameday API (gcp_top_scorer story).
-- One row per ranked player; refreshed by the `sync-top-scorers` Edge Function.
-- Public read (shown in the Rankings "Top Scorers" tab); writes are service-role only.
create table if not exists public.top_scorers (
  fifa_person_id  text primary key,
  rank            integer not null,
  name            text not null,            -- English display name (FIFA name.eng)
  name_es         text,                     -- Spanish display name (FIFA name.spa)
  team_code       text not null,            -- app team code (FIFA URU aliased to URY)
  goals           integer not null default 0,
  assists         integer not null default 0,
  minutes_played  integer,
  image_url       text,
  updated_at      timestamptz not null default now()
);

create index if not exists top_scorers_rank_idx on public.top_scorers (rank);

alter table public.top_scorers enable row level security;

-- Public read: anyone (incl. anon) can view the board.
drop policy if exists "top_scorers public read" on public.top_scorers;
create policy "top_scorers public read"
  on public.top_scorers for select
  using (true);

-- No INSERT/UPDATE/DELETE policies: only the service role (Edge Function) writes,
-- which bypasses RLS.
