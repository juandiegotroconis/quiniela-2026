# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (Vite + React Router)
pnpm build        # production build
pnpm start        # serve the built app
pnpm typecheck    # react-router typegen + tsc
```

No test suite is configured yet.

## Architecture

**Stack**: React Router v7 (framework/SSR mode), React 19, TypeScript, Vite, pnpm.

**Routing** (`src/routes/`): thin route files that render a Screen component and export a `meta()` function. `_index.tsx` redirects to `/rankings`. Routes: `/login`, `/rankings`, `/matches`, `/groups`, `/profile`, `/player/:userId`.

**App shell** (`src/App.tsx`): wraps the app in `AuthProvider` → `DataProvider` → `AppContent`. `AppContent` redirects unauthenticated users to `/login` and shows `TopNav` + `PredictionsBanner` when logged in. `root.tsx` is the Vite entry point.

**Auth** (`src/lib/auth-context.tsx`): Supabase Auth, client-side only. `AuthProvider` listens to `onAuthStateChange` (handles both `INITIAL_SESSION` and `SIGNED_IN` events). On auth, it calls `ensureMembership`, then loads picks, top-scorer pick, and submission status from Supabase. Exposes `user`, `loading`, `quinielaId`, `submitted`, `userPicks`, `topScorer`, `login`, `signup`, `logout`, `submitPredictions`.

**Data** (`src/lib/data-context.tsx`): `DataProvider` fetches `matches` (public, no auth required) and `members` (requires auth) from Supabase. Exposes `matches`, `matchesLoading`, `members`, `membersLoading`, `refreshMembers`, `getMember(userId)`.

**Supabase client** (`src/lib/client.ts`): **singleton** — one shared client instance returned by `getClient()`. Critical: never create new clients per call, the auth session must be shared.

**Queries** (`src/lib/queries.ts`): all DB access. Uses `Tables<'tablename'>` from the auto-generated `src/lib/supabase.ts` for row types. `DEFAULT_QUINIELA_ID` is the hardcoded quiniela UUID.

**Types** (`src/lib/types.ts`): `Match`, `Member`, `MatchPrediction`, `MatchStatus`. These are the app-level types; do not use raw Supabase row types in components.

**Mock data** (`src/lib/mock-data.ts`): still used for static lookup tables only — `GROUPS` (48 teams, 12 groups A–L), `TEAM_FULL`, `TEAM_COLORS`, `AVATAR_COLORS`, `TopScorerSuggestion` type. **No longer used for match data or player rankings** — those come from Supabase.

**Helpers** (`src/lib/helpers.ts`): `calcGroupStandings(groupId, matches, userPicks)`, `groupPredictions(preds, match, myUserId)`, pick result helpers (`getPickResult`, `getResultPoints`, etc.), `getTeamColor`.

**Components**: each component has a co-located `.css` file (e.g. `TopNav.tsx` / `TopNav.css`). BEM-like class naming (`block__element--modifier`).

**Styling**: dark theme only. Design tokens in `src/styles/variables.css` as CSS custom properties (`--surface-*`, `--fg-*`, `--border-*`, `--color-*`, etc.). Two fonts: `Oswald` (display/headings, `/public/fonts/`) and `Noto Sans` (body, Google Fonts). Icons via `@iconify/react`.

## Supabase schema (key tables)

- **`matches`**: `id` (int, football-data.org ID), `home_team_code`, `away_team_code`, `group_name`, `matchday`, `utc_date`, `display_date`, `display_time`, `status` (`TIMED`/`IN_PLAY`/`PAUSED`/`FINISHED`), `score_home_regular`, `score_away_regular`. 72 group-stage matches seeded from football-data.org API (WC2026, starts June 11 2026).
- **`profiles`**: `id` (uuid = auth.uid), `display_name`, `avatar_color` (NOT NULL, default `#02B906`), `created_at`. Populated by `handle_new_user` trigger on `auth.users`.
- **`quiniela_members`**: `id`, `quiniela_id`, `user_id`, `display_name`, `avatar_color`, `total_pts`, `rank`, `prev_rank`, `rank_change`, `exact_count`, `correct_count`, `scored_matches`. RLS: users can only insert/read their own row.
- **`predictions`**: `match_id`, `user_id`, `quiniela_id`, `pick_home`, `pick_away`.
- **`top_scorer_predictions`**: `user_id`, `quiniela_id`, `player_name`, `player_team`.
- **`prediction_submissions`**: `user_id`, `quiniela_id`. Existence = submitted flag.
- **`leaderboard_snapshots`**: `user_id`, `quiniela_id`, `match_id`, `cumulative_pts`. Used for sparkline history.

`DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83"`

## Key conventions

- Route files are thin wrappers; business logic and UI live in Screen components under `src/components/`.
- Always use CSS variables from `variables.css` for colors, spacing, radii, and typography — avoid hardcoded values.
- Team codes are 3-letter FIFA codes (e.g. `MEX`, `BRA`). Full names and colors are in `TEAM_FULL` and `TEAM_COLORS` in `mock-data.ts`.
- **Never overwrite `src/lib/supabase.ts`** — it is auto-generated (`pnpm supabase gen types`). Use `Tables<'tablename'>` for row types.
- Player identity uses `userId: string` (Supabase UUID) everywhere — there is no numeric `ME_ID` or `playerId`.
- `src/vite-env.d.ts` contains `/// <reference types="vite/client" />` — required for `import.meta.env` types.

## External data

Match data is sourced from the **football-data.org API v4** (`GET /v4/competitions/WC/matches?season=2026`, header `X-Auth-Token`). The API returns 104 matches total; only the 72 `GROUP_STAGE` matches are used. All matches are currently `TIMED` with null scores (tournament starts June 11 2026).
