# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start Vite dev server
pnpm build        # production build (tsc -b && vite build)
pnpm preview      # serve the built app locally
pnpm typecheck    # tsc (no emit)
pnpm deploy       # build + wrangler pages deploy dist
```

No test suite is configured yet.

## Architecture

**Stack**: React Router v7 (library mode — client-side SPA, no SSR), React 19, TypeScript, Vite, pnpm.

**Entry / routing** (`src/main.tsx`): the Vite entry. Mounts `TranslationProvider` → `AuthProvider` → `RouterProvider` with a `createBrowserRouter`. Top-level routes: `/login`, `/verify-email`, and the `/` layout route (`App`) whose children are index → redirect to `/rankings`, plus `/rankings`, `/matches`, `/groups`, `/profile`, `/player/:id`. Route files in `src/routes/` are thin wrappers that render a Screen component.

**App shell** (`src/App.tsx`): the `/` layout route. Wraps `DataProvider` → `AppContent`. `AppContent` redirects unauthenticated users to `/login`, renders `JoinQuinielaScreen` when `needsQuiniela`, otherwise shows `TopNav` + `PredictionsBanner` + `<Outlet />`. `PredictionsBanner` shows "Enter Predictions" when not submitted, or "Update Predictions" when submitted and `isUpdatable = true` (hidden on `/profile`).

**Auth** (`src/lib/auth-context.tsx`): Supabase Auth, client-side only. `AuthProvider` listens to `onAuthStateChange`. On auth, loads quiniela membership, picks, top-scorer pick, submission status, `isUpdatable`, and `avatarColor` from Supabase. `AuthUser` includes `avatarColor: string | null`. Exposes `user`, `loading`, `quinielaId`, `needsQuiniela`, `submitted`, `isUpdatable`, `userPicks`, `topScorer`, `login`, `signup`, `logout`, `joinWithCode`, `savePredictions`, `submitPredictions`, `updateAvatarColor`.
- **Critical — `onAuthStateChange` deadlock**: the callback must stay synchronous and must NOT `await` Supabase calls. All client queries share one singleton client (see below); awaiting a query inside the callback holds the auth lock and deadlocks every later query until a page refresh (manifests as taps/buttons silently not working across login, save, submit). DB work after auth is deferred via `setTimeout(0)` and guarded by a per-user ref so Supabase re-firing `SIGNED_IN` on tab focus doesn't reload.
- `savePredictions(picks, scorer)` — upserts only filled picks; does **not** write to `prediction_submissions` (partial save).
- `submitPredictions(picks, scorer)` — requires all picks + scorer; writes to `prediction_submissions`.
- `updateAvatarColor(color)` — updates `profiles.avatar_color` and `quiniela_members.avatar_color` in parallel.

**Data** (`src/lib/data-context.tsx`): `DataProvider` fetches `matches` (public, no auth required) and `members` (requires auth) from Supabase. Exposes `matches`, `matchesLoading`, `members`, `membersLoading`, `refreshMembers`, `getMember(userId)`.

**Supabase client** (`src/lib/client.ts`): **singleton** — one shared client instance returned by `getClient()`. Critical: never create new clients per call, the auth session must be shared.

**Queries** (`src/lib/queries.ts`): all DB access. Uses `Tables<'tablename'>` from the auto-generated `src/lib/supabase.ts` for row types. `DEFAULT_QUINIELA_ID` is the hardcoded quiniela UUID. Key functions:
- `fetchQuinielaIsUpdatable(quinielaId)` → `boolean` — reads `quinielas.is_updatable`.
- `savePredictions(userId, quinielaId, picks, topScorer)` — partial upsert, no submission entry.
- `updateAvatarColor(userId, quinielaId, color)` — updates both `profiles` and `quiniela_members`.
- `searchPlayers(query)` → `PlayerResult[]` — ilike search on `players.name`, limit 20.
- `fetchUserAvatarColor(userId, quinielaId)` — reads avatar color from `quiniela_members`.
- `fetchMatches()` — selects `stage`, `score_home_et`, `score_away_et`, `winner`, `minute`, `venue`, `venue_city`, and `venue_country` in addition to the base columns, mapped onto `Match` by `rowToMatch`.
- `fetchMemberHistory(quinielaId)` / `fetchSingleMemberHistory(quinielaId, userId)` — read `leaderboard_snapshots.rank_at_moment` ordered by `created_at` (sparkline plots **rank over time**, not cumulative points).
- `fetchMatchPredictions(matchId, quinielaId)` — now also returns `pickPenaltiesWinner` (from `predictions.pick_penalties_winner`).
- `fetchQuinielaName(quinielaId)` — reads `quinielas.name` (shown as the leaderboard subtitle instead of the generic "Friends League" string, which remains as fallback).

**Types** (`src/lib/types.ts`): `Match`, `Member`, `MatchPrediction`, `MatchStatus`. These are the app-level types; do not use raw Supabase row types in components. `Match` includes `stage`, `scoreAEt`/`scoreBEt`, `winner`, and `minute` (live match clock, e.g. `"45"`/`"90+3"`, null when not in play) — all needed by `src/lib/scoring.ts` — plus `venue`, `venueCity`, `venueCountry` (all `string | null`, shown below the score in `MatchCard`, `MatchDetail`, and `PredictionEntryForm`). `MatchPrediction` includes `pickPenaltiesWinner: string | null`.

**Mock data** (`src/lib/mock-data.ts`): static lookup tables only — `GROUPS`, `TEAM_FULL`, `TEAM_COLORS`, `AVATAR_COLORS`, `TopScorerSuggestion` type. `TOP_SCORER_SUGGESTIONS` is no longer used by `TopScorerPicker` (replaced by live DB search).

**Helpers** (`src/lib/helpers.ts`): `calcGroupStandings(groupId, matches, userPicks)`, `groupPredictions(preds, match, myUserId)`, pick result helpers (`getPickResult`, `getResultPoints`, `getResultLabel`, `getResultVariant`), `getTeamColor`, `getLiveMinute(match)` (returns `"45'"` while live, else null), and date formatters `formatMatchDate` / `formatMatchTime` / `formatMatchDateTime(utcDate, language)`. The formatters are the **only** way to render match dates/times: they use the app language (`es` → `es-VE`, `en` → `en-US`), capitalize Spanish weekday/month names, and `Match` deliberately has no pre-formatted `date`/`time` fields (format `match.utcDate` at render so language switches apply instantly). When building a date filter chip from a `localDateKey`-style `YYYY-MM-DD` string, parse it as local midnight (`` `${date}T00:00:00` ``, no `Z`) before passing to `formatMatchDate` — appending `Z` parses as UTC midnight and can render the wrong day in timezones behind UTC. `getStageLabelKey(stage)` maps a knockout `stage` (e.g. `LAST_16`, `QUARTER_FINALS`) to a `TranslationKey`, or returns `null` for `GROUP_STAGE` (rendered as "Group X" instead). `KNOCKOUT_STAGE_ORDER` is the tournament order of knockout stages, used to build stage filter/nav options.

**Scoring** (`src/lib/scoring.ts`): single source of truth for prediction scoring, shared by `helpers.ts` and `WhatIfLeaderboard`. `MainResult = 'exact' | 'penalty_exact' | 'half' | 'tendency' | 'miss'` with points `5 / 5 / 4 / 3 / 0` via `getMainResultPoints`. `getMainResult(match, pred)`: group stage compares picks to `score_home_regular`/`score_away_regular` for exact/tendency/miss; knockout stage uses the ET score (`score_home_et`/`score_away_et`) if present, else regular time, and a draw-after-ET resolves via `pickPenaltiesWinner` vs `match.winner` (`penalty_exact` if correct, else `half`). `calculateBracketBonus(predTeamA, predTeamB, actualHome, actualAway)` returns 2/1/0 for the knockout "matchup bonus" — mirrors the SQL `bracket_bonus_points` function.

**i18n** (`src/lib/translation-context.tsx`): `TranslationProvider` wraps the entire app (outermost provider). Persists chosen language to `localStorage` under key `LOCALE`. Default language is `es`. Exposes `t(key)`, `language`, `setLanguage` via `useTranslationContext`. Consumer shortcut: `import { useTranslation } from '~/hooks/useTranslation'`. Translation files are `src/locales/en.json` and `src/locales/es.json` — keys are `UPPER_SNAKE_CASE`. Always add new user-facing strings to both files.

**Components**: each component has a co-located `.css` file (e.g. `TopNav.tsx` / `TopNav.css`). BEM-like class naming (`block__element--modifier`).

- `WhatIfLeaderboard` (`src/components/WhatIfLeaderboard.tsx`): rendered inside `MatchDetail` for `live`/`finished` matches. Projects the leaderboard as if the current match's score were final — applies `getMainResult`/`getMainResultPoints` per member's prediction (from `preds`) on top of their current `pts`, re-sorts, and shows projected rank, rank delta (`PositionChange`), and points delta (`+N`).
- `MatchesScreen` groups/filters matches by **local date** (`localDateKey`, via `Intl.DateTimeFormat('en-CA', ...)`), not the raw UTC date string — a match at e.g. `2026-06-12T01:00:00Z` can fall on a different calendar date depending on the viewer's timezone. Filtering is status (`all`/`live`/`upcoming`/`finished`) × stage (`group`/`knockout`, with group or `KNOCKOUT_STAGE_ORDER` round sub-filters) × date, all driven by `MatchFiltersDrawer` (`src/components/MatchFiltersDrawer.tsx`), a bottom-sheet overlay listing each filter as option chips plus a native `<input type="date">` (bounded by the earliest match date and `WC_FINAL_DATE`). Active filters render as removable chips above the match grid.
- `MatchCard`, `MatchDetail`, and `PredictionEntryForm` all render `match.venue` (+ `venueCity`/`venueCountry`) below the score when present, in the same two-line style: venue name, then city/country in a smaller, dimmer font.
- `Sparkline` plots `leaderboard_snapshots.rank_at_moment` history with dynamic min/max scaling (rank 1 = best, plotted near the top); color (`--color-green`/`--color-error`/`--fg-tertiary`) reflects whether the latest rank improved, worsened, or held.

**Styling**: dark theme only. Design tokens in `src/styles/variables.css` as CSS custom properties (`--surface-*`, `--fg-*`, `--border-*`, `--color-*`, etc.). Two fonts: `Oswald` (display/headings, `/public/fonts/`) and `Noto Sans` (body, Google Fonts). Icons via `@iconify/react`.

## Profile & predictions flow

- `ProfileScreen` owns the persistent header (avatar, color picker, rank/pts, logout, language toggle) via `ProfileScreen.css`. It always renders above either `PredictionEntryForm` or `ProfileReadOnly`.
- The form shows when `!submitted || isUpdatable`. The locked read-only view (`ProfileReadOnly`) shows only when `submitted && !isUpdatable`.
- `PredictionEntryForm` has two actions: **Save Progress** (partial, always available) and **Submit All** (requires all 72 matches + top scorer).
- `TopScorerPicker` searches the `players` table live (300 ms debounce) instead of a static list.
- `RulesModal` (`src/components/RulesModal.tsx`) is a bottom-sheet overlay that displays scoring rules; opened from within the profile/prediction area. Closes on Escape or overlay click.
- `PlayerProfile` and `ProfileReadOnly` count "winner" (correct tendency, no exact score) picks via `getPickResult(...) === 'tendency'` (renamed from the old `'winner'` result value).

## Supabase schema (key tables)

- **`matches`**: `id` (int, football-data.org ID), `fifa_match_id` (text, FIFA's match ID, populated for all 104 matches — see migrations 11-12), `home_team_code`, `away_team_code`, `group_name`, `matchday`, `stage` (default `GROUP_STAGE`), `utc_date`, `display_date`, `display_time`, `status` (`TIMED`/`IN_PLAY`/`PAUSED`/`FINISHED`), `score_home_regular`, `score_away_regular`, `score_home_et`, `score_away_et`, `score_home_penalties`, `score_away_penalties`, `duration`, `winner`, `minute` (text, live match clock e.g. `"45"`/`"90+3"`, null when not in play), `venue`, `venue_city`, `venue_country` (references `teams.code`), `last_synced_at`. 72 group-stage matches seeded from football-data.org API (WC2026, starts June 11 2026); `venue`/`venue_city`/`venue_country` are seeded separately from the FIFA WC2026 schedule (not from the API — see migrations 9-10).
- **`profiles`**: `id` (uuid = auth.uid), `display_name`, `avatar_color` (NOT NULL, default `#02B906`), `created_at`. Populated by `handle_new_user` trigger on `auth.users`. RLS: users can select and update their own row.
- **`quinielas`**: `id`, `name`, `slug`, `join_code`, `is_active`, `is_updatable` (boolean, default `true`), `variant`. `is_updatable = false` locks all prediction writes via RLS.
- **`quiniela_members`**: `id`, `quiniela_id`, `user_id`, `display_name`, `avatar_color`, `total_pts`, `rank`, `prev_rank`, `rank_change`, `exact_count`, `correct_count`, `wrong_count`, `scored_matches`, `accuracy`. RLS: users can insert, read, and update their own row.
- **`predictions`**: `match_id`, `user_id`, `quiniela_id`, `pick_home`, `pick_away`, `pick_penalties_winner`. RLS: writes only allowed when `quinielas.is_updatable = true`.
- **`top_scorer_predictions`**: `user_id`, `quiniela_id`, `player_name`, `player_team`. Same `is_updatable` RLS gate as `predictions`.
- **`prediction_submissions`**: `user_id`, `quiniela_id`. Existence = "officially submitted" flag (does not lock picks — `is_updatable` does).
- **`bracket_predictions`**: `id`, `user_id`, `quiniela_id`, `match_id` (a knockout-stage slot), `pred_home_team_code`, `pred_away_team_code`, `updated_at`. For each knockout match, a user predicts which two teams will play in it — used by the "matchup bonus" (`calculateBracketBonus` / SQL `bracket_bonus_points`, +2/+1/0), only applied when the main result scored 0. Same `is_updatable` RLS gate as `predictions`.
- **`leaderboard_snapshots`**: `user_id`, `quiniela_id`, `match_id`, `cumulative_pts`, `rank_at_moment`, `created_at`. `rank_at_moment` drives the `Sparkline` rank-history chart (read via `fetchMemberHistory`/`fetchSingleMemberHistory`, ordered by `created_at`).
- **`players`**: `id`, `fd_id` (football-data.org player ID, unique), `name`, `team_code`, `position`, `shirt_number`. Seeded via `scripts/seed-players.ts`. RLS: public read.
- **`teams`**: `code`, `name`, `color`, `fd_id`, `group_id`, `iso2`.
- **`top_scorers`**: `fifa_person_id` (PK), `rank`, `name` (eng), `name_es` (spa), `team_code` (app code; FIFA `URU` aliased to `URY`), `goals`, `assists`, `minutes_played`, `image_url`, `updated_at`. The Golden Boot board, refreshed by the `sync-top-scorers` Edge Function from FIFA's gameday API (see "Top scorers (Golden Boot) sync"). RLS: public read; service-role-only writes.

`refresh_quiniela_leaderboard(quiniela_id, match_id?)` (Postgres function) recomputes `quiniela_members` stats and rank via `ROW_NUMBER()` (tiebreak: `total_pts` → `exact_count` → `correct_count` → `joined_at`, so ranks are always unique, no ties), and inserts a `leaderboard_snapshots` row when `match_id` is given.

`DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83"`

## Migrations

SQL files live in `supabase/migrations/`. Apply them in the Supabase SQL editor in order:
1. `20260526_add_is_updatable_and_players.sql` — adds `is_updatable` to `quinielas`, creates `players` table, updates prediction RLS.
2. `players_seed.sql` — inserts all 1,197 WC2026 players (generated by `scripts/seed-players.ts`).
3. `20260526_profile_update_policies.sql` — adds UPDATE RLS policies for `profiles` and `quiniela_members`.
4. `20260611_bracket_predictions.sql` — creates `bracket_predictions` table + RLS policies for the knockout matchup bonus.
5. `20260611_prediction_points_v2.sql` — adds `prediction_points_v2` and `bracket_bonus_points` SQL functions implementing the rules in `RulesModal.tsx`/`src/lib/scoring.ts`. **Draft/additive only** — not yet wired into `refresh_quiniela_leaderboard`; see the migration's header comment for the remaining steps (diff against `prediction_points`, then fall back to `bracket_bonus_points` when `prediction_points_v2` returns 0 on a knockout match).
6. `20260611_leaderboard_unique_rank.sql` — rewrites `refresh_quiniela_leaderboard` to assign unique ranks via `ROW_NUMBER()` with tiebreakers, and sets `search_path = public`.
7. `20260611_add_match_minute.sql` — adds `minute` (text) to `matches` for live match-clock tracking.
8. `20260611_sync_live_matches_cron.sql` — (already applied via MCP) stores `project_url` and `anon_key` in Vault and registers two pg_cron jobs (originally `*/2 16-23 * * *` and `*/2 0-6 * * *`, UTC; see migration 13 — the live schedule is every minute) that POST to the `sync-live-matches` Edge Function via `pg_net`. Requires the `pg_cron` and `pg_net` extensions (enabled).
9. `20260611_add_match_venue.sql` — adds `venue` (text) and `venue_country` (references `teams.code`) to `matches`, sourced from the FIFA WC2026 schedule.
10. `20260612_add_match_venue_city.sql` — adds `venue_city` (text) to `matches` and backfills it from `venue` via a hardcoded venue→city `case` mapping.
11. `20260612_add_fifa_match_id.sql` — adds `fifa_match_id` (text) to `matches` and populates it for the 72 group-stage matches from FIFA's calendar API (joined on `(utc_date, home_team_code, away_team_code)`, with `URY` → `URU` alias since FIFA uses a different Uruguay code).
12. `20260612_add_fifa_match_id_knockout.sql` — populates `fifa_match_id` for the 32 knockout matches (joined on exact `utc_date`; FIFA's calendar has null team placeholders for these, but the 32 kickoff times are a unique bijection).
13. `20260617_cron_every_minute.sql` — (already applied via CLI) reschedules both `sync-live-matches-*` cron jobs from `*/2` to `* 16-23 * * *` / `* 0-6 * * *` (every minute), reconciling the migration history with a schedule change that had been made directly against the live DB.
14. `20260617_finished_match_correction_trigger.sql` — (already applied via CLI) widens `on_match_finished()` to also call `refresh_quiniela_leaderboard` when a `FINISHED` match's score/winner/duration changes (not just on the transition into `FINISHED`) — needed because `sync-live-matches` now corrects a `FINISHED` match's score within a grace window (see Live score sync below) without changing `status`, which the original trigger condition ignored.
15. `20260622_top_scorers.sql` — (applied via CLI) creates the `top_scorers` table (Golden Boot board) + public-read RLS (service-role writes only). See "Top scorers (Golden Boot) sync".
16. `20260622_sync_top_scorers_cron.sql` — (applied via CLI) registers two pg_cron jobs (`sync-top-scorers-evening` / `-overnight`, `*/30 16-23 * * *` & `*/30 0-6 * * *`) POSTing to the `sync-top-scorers` Edge Function; reuses the existing `project_url`/`anon_key` Vault secrets.

To regenerate `players_seed.sql`: `pnpm tsx scripts/seed-players.ts` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; takes ~5 min due to API rate limits).

To regenerate `src/lib/supabase.ts`: `pnpm supabase:types` (runs `supabase gen types typescript --project-id ljnfquqjvlbiynzxdedq --schema public`).

## Key conventions

- Route files are thin wrappers; business logic and UI live in Screen components under `src/components/`.
- Always use CSS variables from `variables.css` for colors, spacing, radii, and typography — avoid hardcoded values.
- Team codes are 3-letter FIFA codes (e.g. `MEX`, `BRA`). Full names and colors are in `TEAM_FULL` and `TEAM_COLORS` in `mock-data.ts`.
- **Never overwrite `src/lib/supabase.ts`** — it is auto-generated (`pnpm supabase:types`). Use `Tables<'tablename'>` for row types.
- Player identity uses `userId: string` (Supabase UUID) everywhere — there is no numeric `ME_ID` or `playerId`.
- `src/vite-env.d.ts` contains `/// <reference types="vite/client" />` — required for `import.meta.env` types.
- All user-facing strings must go through `useTranslation` — never hardcode display text. Add keys to both `src/locales/en.json` and `src/locales/es.json`.

## Live score sync

The `sync-live-matches` Edge Function (`supabase/functions/sync-live-matches/index.ts`, deployed with `verify_jwt` on) runs every minute during the match window (16:00–06:58 UTC, via the two pg_cron jobs in migrations 8/13 — kickoffs range 16:00–04:00 UTC). **FIFA's live API is the primary source; football-data.org is the fallback** (football-data's free tier proved unreliable on day 1: the opener was stuck on `TIMED` at minute 33', then a partial response flapped a premature winner mid-match). Each tick:
1. Queries `matches` for candidates: `utc_date` within the last 6 h (plus a 2-min lookahead), and either `status != 'FINISHED'` or the row was marked `FINISHED` within the last `RECHECK_WINDOW_MS` (5 min — see safeguard (d) below). **If empty, exits without calling any API** — out-of-window ticks are free.
2. **Primary — FIFA**: one request per candidate to `api.fifa.com/api/v3/live/football/{fifa_match_id}` (undocumented, no auth — just browser-like headers). FIFA values are translated into football-data vocabulary before writing (the full table is documented at the top of `index.ts`): `MatchStatus` 0/1/3 → `FINISHED`/`TIMED`/live (`Period` 4 = half-time → `PAUSED`), `ResultType` 1/2/3 → `REGULAR`/`PENALTY_SHOOTOUT`/`EXTRA_TIME`, `Winner` (a FIFA team ID) → `HOME_TEAM`/`AWAY_TEAM` by comparing against `HomeTeam.IdTeam`/`AwayTeam.IdTeam` (null + finished → `DRAW`), `minute` ← `MatchTime` with the trailing apostrophe stripped (`"46'"` → `"46"`). FIFA's `Score` includes ET (no separate 90' score exists), so past regular time only the `_et` columns are written. ET-phase `Period` values (6–9, 11) are unobserved assumptions — verify when the first knockout match goes to ET.
3. **Fallback — football-data.org**: used per candidate when FIFA is unreachable, the row has no `fifa_match_id`, or `MatchStatus` is an unknown enum value. One request covers the whole fallback queue (`dateFrom`/`dateTo` = ±1 day).
4. **Anti-reset/anti-stale safeguards** (both sources): (a) `STATUS_RANK` guard — a source reporting a status behind what the row already has (`TIMED` < live < `FINISHED`) is stale and its write is skipped entirely; (b) null pruning — null score/winner/duration fields are dropped from the update payload so a source that omits data can never wipe stored values (`minute` is the exception: cleared explicitly on `FINISHED`, kept during half-time); (c) `winner` is only ever written on `FINISHED` — football-data flapped a premature winner on a live match; (d) **FINISHED recheck window** — a source can flag a match `FINISHED` a beat before its score reflects a very-late goal (observed 2026-06-16: IRQ-NOR posted `FINISHED` 1-3, corrected to 1-4 a tick later by FIFA, but the row had already dropped out of polling under the old `status != 'FINISHED'` filter and never got corrected). A `FINISHED` row is now rechecked for up to `RECHECK_WINDOW_MS` after its first `FINISHED` write — only written again if the score/winner/duration actually changed — then excluded from polling for good.
5. Leaderboard refresh is **not** called here — the `trg_match_finished` trigger on `matches` (`on_match_finished()`) calls `refresh_quiniela_leaderboard(quiniela_id, match_id)` whenever a match transitions to `FINISHED`, **or** its score/winner/duration changes while already `FINISHED` (the latter covers a safeguard-(d) correction landing inside the recheck window; see migration 14).

The football-data API key lives in the `FOOTBALL_DATA_KEY` Edge Function secret (never in the repo or DB). The Vault holds only `project_url` and `anon_key` for the cron jobs' `net.http_post` call.

## Top scorers (Golden Boot) sync

The `sync-top-scorers` Edge Function (`supabase/functions/sync-top-scorers/index.ts`, `verify_jwt` on) refreshes the `top_scorers` table from **FIFA's gameday API** (`gameday-prod.fifa.mangodev.co.uk/1-0/stories`, the `gcp_top_scorer` story). This is the **only** source — the unauthenticated `api.fifa.com/api/v3` statistics routes used by `sync-live-matches` are deprecated/empty for stats (they return `null`). A **single** request returns the whole top-50 board: one story whose `actors[]` array holds 50 players, each tagged with rank (`number`), `stats:goals`, `stats:assists`, minutes, `team:abbreviation`, `staff:image`, and `_externalSportsPersonId`. Only the **anchored** `:page:1` query form works — the `:page:(.*)` wildcard is rejected (403/429); `page:1` already contains the full board. The function aliases FIFA's `URU` → app `URY` (mirroring migration 11) and prunes anyone who drops off the board. Two pg_cron jobs (migration 16) run it **every 30 min, 16:00–06:58 UTC**; it early-exits (no FIFA call) unless a match is live or finished within the last 35 min (just over the cron interval, so a just-finished match is still caught on the next tick), so off-window/idle ticks are free.

**Auth**: gameday requires an **anonymous Bearer token** (403 without it) that expires every ~22h. The function mints a fresh one each run via an **unauthenticated GET** to `https://cxm-api.fifa.com/fifaplusweb/api/external/gameDay/token` (no cookie/key — just the browser-like `FIFA_HEADERS`), which returns `{"token":"eyJ…"}` — exactly what fifa.com's stats widget does on load. **No manual token maintenance.** (The mint endpoint was found via a HAR capture of the stats page; it lives in a lazy JS chunk so it isn't visible in the main bundles.)

Read side: `fetchTopScorers()` (public read) + `fetchTopScorerPicks(quinielaId)` in `queries.ts`; the **"Top Scorers" tab** in `LeaderboardScreen` (alongside Standings/Streaks) renders `TopScorersTab`, which matches each ranked scorer to the members who picked them via **accent-insensitive name (NFD-normalized) + team code** — predictions store `player_name`/`player_team`, FIFA gives `name.eng`/`team:abbreviation`. Players a member picked who aren't in the top 50 simply don't appear.

## External data

Match data is sourced from the **football-data.org API v4** (`GET /v4/competitions/WC/matches?season=2026`, header `X-Auth-Token`). The API returns 104 matches total; only the 72 `GROUP_STAGE` matches are used. All matches are currently `TIMED` with null scores (tournament starts June 11 2026).

**Free tier notes**: 10 requests/minute. The global `/v4/matches?dateFrom&dateTo` endpoint **excludes the World Cup on the free tier** — always use `/v4/competitions/WC/matches?season=2026` (optionally with `dateFrom`/`dateTo`, which it does support and which can return multiple matches in one request). `score.fullTime` acts as the live running score (flips from `null` to `0`/`0` when status becomes `IN_PLAY`); `minute` (e.g. `"90+5"`) is documented for live matches but not yet confirmed available on this tier — the `matches.minute` column is in place and `sync-live-matches` stores it if present (it is absent on `TIMED` matches; verified 2026-06-11). `venue` is **not** in the match payload on this tier (verified against a live response: top-level keys are `area`, `competition`, `season`, `id`, `utcDate`, `status`, `matchday`, `stage`, `group`, `lastUpdated`, `homeTeam`, `awayTeam`, `score`, `odds`, `referees`) — `matches.venue`/`venue_city`/`venue_country` are instead seeded from the static FIFA WC2026 schedule via migrations 9-10, not synced by `sync-live-matches`.

Player/squad data is sourced from `GET /v4/teams/{fd_id}` per team. 1,197 players across 48 teams are seeded into the `players` table.
