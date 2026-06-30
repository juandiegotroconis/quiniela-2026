# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start Vite dev server
pnpm build        # production build (tsc -b && vite build)
pnpm preview      # serve the built app locally
pnpm typecheck    # tsc (no emit)
pnpm test         # node --test (Edge Function pure-logic unit tests)
pnpm deploy       # build + wrangler pages deploy dist
```

Unit tests cover `supabase/functions/sync-live-matches/translate.ts` only. The React app has no test suite.

## Architecture

**Stack**: React Router v7 (library mode — client-side SPA, no SSR), React 19, TypeScript, Vite, pnpm.

**Entry / routing** (`src/main.tsx`): mounts `TranslationProvider` → `AuthProvider` → `RouterProvider`. Route files in `src/routes/` are thin wrappers that render Screen components.

**App shell** (`src/App.tsx`): wraps `DataProvider` → `AppContent`. Renders `TopNav` + `PredictionsBanner` + `KnockoutBanner` + `<Outlet />`. `KnockoutBanner` auto-hides at the deadline via `useNowTick`.

**Auth** (`src/lib/auth-context.tsx`): Supabase Auth, client-side only.
- **Critical — `onAuthStateChange` deadlock**: the callback must stay synchronous and must NOT `await` Supabase calls. Awaiting inside the callback holds the auth lock and deadlocks every later query until a page refresh. DB work after auth is deferred via `setTimeout(0)` and guarded by a per-user ref so Supabase re-firing `SIGNED_IN` on tab focus doesn't reload.

**Supabase client** (`src/lib/client.ts`): **singleton** — one shared client instance returned by `getClient()`. Never create new clients per call.

**Queries** (`src/lib/queries.ts`): all DB access. Uses `Tables<'tablename'>` from auto-generated `src/lib/supabase.ts`. `DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83"`.

**Types** (`src/lib/types.ts`): `Match`, `Member`, `MatchPrediction`, `MatchStatus` — app-level types. Do not use raw Supabase row types in components. `MatchPrediction` includes `pickPenaltiesWinner: string | null`.

**Helpers** (`src/lib/helpers.ts`):
- Date formatters `formatMatchDate` / `formatMatchTime` / `formatMatchDateTime` are the **only** way to render match dates/times. `Match` has no pre-formatted date fields — format `match.utcDate` at render so language switches apply instantly.
- When building a date filter chip from a `YYYY-MM-DD` string, parse as local midnight (`` `${date}T00:00:00` ``, no `Z`) — appending `Z` shifts to UTC midnight and can render the wrong day.
- `getStageLabelKey(stage)` returns `null` for `GROUP_STAGE` (rendered as "Group X"). `KNOCKOUT_STAGE_ORDER` is the tournament order of knockout stages.
- `isMatchWritable(match, matches, {knockoutMode, graceActive, now})` mirrors the `is_prediction_open` RLS gate — drives per-match input locking and the save filter in `PredictionEntryForm`.
- `isLiveDataStale(match, now)` (`LIVE_STALE_THRESHOLD_MS` = 5 min) flags a live match whose `lastSyncedAt` has gone stale.

**Scoring** (`src/lib/scoring.ts`): single source of truth for prediction scoring. `MainResult = 'exact' | 'penalty_exact' | 'half' | 'tendency' | 'miss'` with points `5 / 5 / 4 / 3 / 0`. Group stage: compares picks to `score_home_regular`/`score_away_regular`. Knockout: uses ET score if present, else regular; draw-after-ET resolves via `pickPenaltiesWinner` vs `match.winner`. Matchup bonus (`calculateBracketBonus`): 2/1/0, only when main result = 0 and stage is `LAST_16` or later.

**i18n** (`src/lib/translation-context.tsx`): `TranslationProvider` is the outermost provider. Default language `es`. Consumer shortcut: `import { useTranslation } from '~/hooks/useTranslation'`. Keys are `UPPER_SNAKE_CASE` in `src/locales/en.json` and `src/locales/es.json`. Always add new user-facing strings to both files.

**Stale live-data hint**: `MatchCard` and `MatchDetail` show "Live updates delayed" when `isLiveDataStale`. Driven by `useNowTick` (`src/hooks/useNowTick.ts`) — a single shared 30s ticker via `useSyncExternalStore`. Pass `useNowTick(false)` to opt out.

**Styling**: dark theme only. CSS custom properties in `src/styles/variables.css` (`--surface-*`, `--fg-*`, `--border-*`, `--color-*`). Fonts: `Oswald` (headings) and `Noto Sans` (body). Icons via `@iconify/react`. BEM-like class naming on components.

## Profile & predictions flow

- `showForm = isUpdatable || knockoutOpen || graceActive`. Otherwise `ProfileReadOnly` shows.
- `PredictionEntryForm` modes: when `isUpdatable` (`groupEntryEnabled`) → full entry (group grid, top scorer, Submit All); when knockout-only → group/top-scorer/Submit hidden, only open knockout stage editable.
- `PlayerProfile` and `ProfileReadOnly` count tendency picks via `getPickResult(...) === 'tendency'`.

## Knockout predictions

Knockout entry is governed by `knockout_mode` + a stage **deadline** (first kickoff of that stage), **independent of `is_updatable`**. Window only opens once the entire Round of 32 is resolved.

- **`STAGE_BY_STAGE`** (default): each round opens individually once teams are known; no matchup guessing.
- **`ONE_SHOT`**: whole bracket entered up front before R32 starts; undetermined rounds use matchup pickers (written to `bracket_predictions`), earning the +2/+1 bonus.
- **Save filtering**: `handleSave` omits picks for locked stages — a locked-stage row would be rejected by the RLS gate and fail the whole upsert.
- **Server enforcement**: `is_prediction_open(match_id, quiniela_id)` is the authoritative gate; the frontend lock mirrors it.

## Late-submission grace

Gives specific players a personal catch-up window after `is_updatable` is off, only for matches that haven't kicked off. Top-scorer pick is not included.

- **Granting (admin-only)**: `select grant_prediction_grace('<quiniela_members.id>', 24);` in the SQL editor. `p_hours <= 0` clears it. No in-app UI.
- **Server gate**: `is_prediction_open` allows the write when the member has an active `predictions_grace_until` and the match hasn't kicked off.
- **Frontend**: `graceUntil` flows through `auth-context` → `ProfileScreen`/`App`. `GraceBanner` announces the window (auto-hides at deadline). Grace mode shows the group grid with per-match locking but hides progress bar, Submit-All, and top-scorer picker.

## Supabase schema (key tables)

- **`matches`**: `id`, `fifa_match_id`, `home_team_code`, `away_team_code`, `group_name`, `matchday`, `stage`, `utc_date`, `status` (`TIMED`/`IN_PLAY`/`PAUSED`/`FINISHED`), `score_home_regular`, `score_away_regular`, `score_home_et`, `score_away_et`, `score_home_penalties`, `score_away_penalties`, `duration`, `winner`, `minute` (live clock, null when not in play), `venue`, `venue_city`, `venue_country`, `last_synced_at`.
- **`quinielas`**: includes `is_updatable` (gates group-stage + top-scorer writes only) and `knockout_mode` (`ONE_SHOT` | `STAGE_BY_STAGE`).
- **`quiniela_members`**: includes `total_pts`, `rank`, `exact_count`, `correct_count`, `wrong_count`, `accuracy`, `predictions_grace_until` (null = no grace).
- **`predictions`**: `match_id`, `user_id`, `quiniela_id`, `pick_home`, `pick_away`, `pick_penalties_winner`. Writes gated by `is_prediction_open`.
- **`bracket_predictions`**: `match_id`, `pred_home_team_code`, `pred_away_team_code`. Matchup bonus applies for `LAST_16`+, only when main result = 0. Same RLS gate as `predictions`.
- **`prediction_submissions`**: `user_id`, `quiniela_id`. Existence = officially submitted (does not lock picks).
- **`top_scorer_predictions`**: `user_id`, `quiniela_id`, `player_name`, `player_team`. Writes gated by `is_updatable`.
- **`leaderboard_snapshots`**: `rank_at_moment` drives the `Sparkline` rank-history chart (rank over time, not points).
- **`top_scorers`**: Golden Boot board. `fifa_person_id` PK. FIFA `URU` aliased to app `URY`. Public read; service-role-only writes.

**Key DB functions:**

`refresh_quiniela_leaderboard(quiniela_id, match_id?)` — recomputes stats + rank via `ROW_NUMBER()` (tiebreak: `total_pts` → `exact_count` → `correct_count` → `joined_at`). Uses `prediction_total_points()` which adds the matchup bonus only when main result = 0 and stage is not `GROUP_STAGE`/`LAST_32`. The legacy `prediction_points()` is deprecated — do not call it.

`is_prediction_open(match_id, quiniela_id)` (`SECURITY INVOKER`) — grace override first, then group → `is_updatable`, knockout → mode + stage deadline.

`grant_prediction_grace(p_member_id, p_hours)` (`SECURITY DEFINER`, admin-only).

## Migrations

SQL files in `supabase/migrations/` — 25 migrations applied in order (numbered by date).

To regenerate `players_seed.sql`: `pnpm tsx scripts/seed-players.ts` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`).

To regenerate `src/lib/supabase.ts`: `pnpm supabase:types` (runs `supabase gen types typescript --project-id ljnfquqjvlbiynzxdedq --schema public`).

## Key conventions

- Route files are thin wrappers; business logic lives in Screen components under `src/components/`.
- Always use CSS variables from `variables.css` — avoid hardcoded values.
- Team codes are 3-letter FIFA codes. Full names/colors in `TEAM_FULL`/`TEAM_COLORS` in `mock-data.ts`.
- **Never overwrite `src/lib/supabase.ts`** — it is auto-generated. Use `Tables<'tablename'>` for row types.
- Player identity uses `userId: string` (Supabase UUID) — no numeric `ME_ID` or `playerId`.
- All user-facing strings must go through `useTranslation`. Add keys to both locale files.

## Live score sync

`sync-live-matches` Edge Function runs every minute during the match window (16:00–06:58 UTC). **FIFA live API is primary; football-data.org is fallback.** Exits without any API call if no candidates. A `FINISHED` row is rechecked for score corrections for up to 5 min, then excluded. Leaderboard refresh is triggered by the `trg_match_finished` DB trigger, not this function.

Pure translation/anti-reset logic lives in `translate.ts` (Deno/Node-portable, unit-tested). Keep it portable.

## Knockout bracket sync

`sync-knockout-bracket` fills `home_team_code`/`away_team_code` on knockout matches from FIFA's calendar API, one-way null-fill only. Runs every 15 min 24/7; early-exits once all knockout matches have both teams.

## Top scorers (Golden Boot) sync

`sync-top-scorers` refreshes `top_scorers` from FIFA's gameday API — full top-50 in one request. Aliases `URU` → `URY`. Runs every 30 min during the match window; early-exits unless a match is live or finished within the last 35 min. Read via `fetchTopScorers()` + `fetchTopScorerPicks(quinielaId)` in `queries.ts`.

## External data

Match data: **football-data.org API v4** — always use `/v4/competitions/WC/matches?season=2026`. The global `/v4/matches` endpoint excludes the World Cup on the free tier.
