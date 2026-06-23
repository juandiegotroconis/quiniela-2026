-- Match event feed (goals, cards, substitutions) sourced from FIFA's timeline
-- API by sync-live-matches (see supabase/functions/sync-live-matches/index.ts).
-- Events are stored language-neutral (type enum + player names + minute); the
-- frontend builds the displayed sentence from i18n keys (MatchEventTimeline).
-- football-data.org is not used here -- it has no event feed on the free tier.
create table public.match_events (
  id bigint generated always as identity primary key,
  match_id integer not null references public.matches(id) on delete cascade,
  fifa_event_id text not null,             -- FIFA EventId, stable per event
  type text not null,                      -- 'goal' | 'yellow' | 'red' | 'substitution'
  team_code text references public.teams(code),
  player_name text,                        -- scorer / booked player / player coming on
  secondary_name text,                     -- assist (goal) or player going off (sub)
  minute text,                             -- FIFA MatchMinute, e.g. "9'" / "90'+2'"
  period integer,
  home_goals integer,                      -- running score at the event
  away_goals integer,
  sort_order integer not null default 0,   -- event order within the match
  unique (match_id, fifa_event_id)
);

create index match_events_match_id_idx on public.match_events (match_id);

alter table public.match_events enable row level security;

create policy "public read match_events"
  on public.match_events for select
  using (true);
