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

**Entry / routing** (`src/main.tsx`): the Vite entry. Mounts `AuthProvider` → `RouterProvider` with a `createBrowserRouter`. Top-level routes: `/login`, `/verify-email`, and the `/` layout route (`App`) whose children are index → redirect to `/rankings`, plus `/rankings`, `/matches`, `/groups`, `/profile`, `/player/:id`. Route files in `src/routes/` are thin wrappers that render a Screen component.

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

**Types** (`src/lib/types.ts`): `Match`, `Member`, `MatchPrediction`, `MatchStatus`. These are the app-level types; do not use raw Supabase row types in components.

**Mock data** (`src/lib/mock-data.ts`): static lookup tables only — `GROUPS`, `TEAM_FULL`, `TEAM_COLORS`, `AVATAR_COLORS`, `TopScorerSuggestion` type. `TOP_SCORER_SUGGESTIONS` is no longer used by `TopScorerPicker` (replaced by live DB search).

**Helpers** (`src/lib/helpers.ts`): `calcGroupStandings(groupId, matches, userPicks)`, `groupPredictions(preds, match, myUserId)`, pick result helpers (`getPickResult`, `getResultPoints`, etc.), `getTeamColor`.

**Components**: each component has a co-located `.css` file (e.g. `TopNav.tsx` / `TopNav.css`). BEM-like class naming (`block__element--modifier`).

**Styling**: dark theme only. Design tokens in `src/styles/variables.css` as CSS custom properties (`--surface-*`, `--fg-*`, `--border-*`, `--color-*`, etc.). Two fonts: `Oswald` (display/headings, `/public/fonts/`) and `Noto Sans` (body, Google Fonts). Icons via `@iconify/react`.

## Profile & predictions flow

- `ProfileScreen` owns the persistent header (avatar, color picker, rank/pts, logout) via `ProfileScreen.css`. It always renders above either `PredictionEntryForm` or `ProfileReadOnly`.
- The form shows when `!submitted || isUpdatable`. The locked read-only view (`ProfileReadOnly`) shows only when `submitted && !isUpdatable`.
- `PredictionEntryForm` has two actions: **Save Progress** (partial, always available) and **Submit All** (requires all 72 matches + top scorer).
- `TopScorerPicker` searches the `players` table live (300 ms debounce) instead of a static list.

## Supabase schema (key tables)

- **`matches`**: `id` (int, football-data.org ID), `home_team_code`, `away_team_code`, `group_name`, `matchday`, `utc_date`, `display_date`, `display_time`, `status` (`TIMED`/`IN_PLAY`/`PAUSED`/`FINISHED`), `score_home_regular`, `score_away_regular`. 72 group-stage matches seeded from football-data.org API (WC2026, starts June 11 2026).
- **`profiles`**: `id` (uuid = auth.uid), `display_name`, `avatar_color` (NOT NULL, default `#02B906`), `created_at`. Populated by `handle_new_user` trigger on `auth.users`. RLS: users can select and update their own row.
- **`quinielas`**: `id`, `name`, `slug`, `join_code`, `is_active`, `is_updatable` (boolean, default `true`). `is_updatable = false` locks all prediction writes via RLS.
- **`quiniela_members`**: `id`, `quiniela_id`, `user_id`, `display_name`, `avatar_color`, `total_pts`, `rank`, `prev_rank`, `rank_change`, `exact_count`, `correct_count`, `scored_matches`. RLS: users can insert, read, and update their own row.
- **`predictions`**: `match_id`, `user_id`, `quiniela_id`, `pick_home`, `pick_away`. RLS: writes only allowed when `quinielas.is_updatable = true`.
- **`top_scorer_predictions`**: `user_id`, `quiniela_id`, `player_name`, `player_team`. Same `is_updatable` RLS gate as `predictions`.
- **`prediction_submissions`**: `user_id`, `quiniela_id`. Existence = "officially submitted" flag (does not lock picks — `is_updatable` does).
- **`leaderboard_snapshots`**: `user_id`, `quiniela_id`, `match_id`, `cumulative_pts`. Used for sparkline history.
- **`players`**: `id`, `fd_id` (football-data.org player ID, unique), `name`, `team_code`, `position`, `shirt_number`. Seeded via `scripts/seed-players.ts`. RLS: public read.
- **`teams`**: `code`, `name`, `color`, `fd_id`, `group_id`, `iso2`.

`DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83"`

## Migrations

SQL files live in `supabase/migrations/`. Apply them in the Supabase SQL editor in order:
1. `20260526_add_is_updatable_and_players.sql` — adds `is_updatable` to `quinielas`, creates `players` table, updates prediction RLS.
2. `players_seed.sql` — inserts all 1,197 WC2026 players (generated by `scripts/seed-players.ts`).
3. `20260526_profile_update_policies.sql` — adds UPDATE RLS policies for `profiles` and `quiniela_members`.

To regenerate `players_seed.sql`: `pnpm tsx scripts/seed-players.ts` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; takes ~5 min due to API rate limits).

## Key conventions

- Route files are thin wrappers; business logic and UI live in Screen components under `src/components/`.
- Always use CSS variables from `variables.css` for colors, spacing, radii, and typography — avoid hardcoded values.
- Team codes are 3-letter FIFA codes (e.g. `MEX`, `BRA`). Full names and colors are in `TEAM_FULL` and `TEAM_COLORS` in `mock-data.ts`.
- **Never overwrite `src/lib/supabase.ts`** — it is auto-generated (`pnpm supabase gen types`). Use `Tables<'tablename'>` for row types.
- Player identity uses `userId: string` (Supabase UUID) everywhere — there is no numeric `ME_ID` or `playerId`.
- `src/vite-env.d.ts` contains `/// <reference types="vite/client" />` — required for `import.meta.env` types.

## External data

Match data is sourced from the **football-data.org API v4** (`GET /v4/competitions/WC/matches?season=2026`, header `X-Auth-Token`). The API returns 104 matches total; only the 72 `GROUP_STAGE` matches are used. All matches are currently `TIMED` with null scores (tournament starts June 11 2026).

Player/squad data is sourced from `GET /v4/teams/{fd_id}` per team. 1,197 players across 48 teams are seeded into the `players` table.
