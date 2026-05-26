# Quiniela 2026

A World Cup 2026 prediction league app. Players submit score predictions for all 72 group-stage matches, compete on a live leaderboard, and track standings and trends throughout the tournament.

## Stack

- **Frontend**: React 19, React Router v7 (framework/SSR mode), TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Package manager**: pnpm
- **Styling**: Dark theme, CSS custom properties, BEM-like class naming
- **Fonts**: Oswald (display), Noto Sans (body)
- **Icons**: `@iconify/react`

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- A Supabase project (see [schema](#database-schema))

### Environment variables

Create a `.env` file at the project root:

```env
VITE_DB_URL=https://<project-ref>.supabase.co
VITE_DB_PUBLISHABLE_KEY=<anon-public-key>
```

### Commands

```bash
pnpm dev          # start dev server (http://localhost:5173)
pnpm build        # production build
pnpm start        # serve the built app
pnpm typecheck    # react-router typegen + tsc
```

## Project structure

```
src/
  App.tsx                   # App shell: AuthProvider > DataProvider > AppContent
  main.tsx                  # Vite entry point
  vite-env.d.ts             # /// <reference types="vite/client" />
  routes/                   # Thin route files (render a Screen + export meta())
    login.tsx
    rankings.tsx            # /rankings
    matches.tsx             # /matches
    groups.tsx              # /groups
    profile.tsx             # /profile
    player.tsx              # /player/:userId
  components/               # Screen components + co-located CSS
    AuthScreen.tsx/css
    LeaderboardScreen.tsx/css
    MatchesScreen.tsx/css
    GroupsScreen.tsx/css
    ProfileScreen.tsx/css
    PlayerProfile.tsx/css
    ProfileReadOnly.tsx/css
    PredictionEntryForm.tsx/css
    ...                     # Shared UI components
  lib/
    client.ts               # Singleton Supabase client
    auth-context.tsx        # AuthProvider + useAuth()
    data-context.tsx        # DataProvider + useData()
    queries.ts              # All Supabase queries
    types.ts                # App-level types: Match, Member, MatchPrediction
    helpers.ts              # calcGroupStandings, groupPredictions, pick scoring
    mock-data.ts            # Static lookup tables: GROUPS, TEAM_FULL, TEAM_COLORS, AVATAR_COLORS
    supabase.ts             # Auto-generated Supabase types — DO NOT EDIT
  styles/
    variables.css           # Design tokens (--surface-*, --fg-*, --color-*, etc.)
```

## Architecture

### Authentication

`AuthProvider` uses Supabase Auth and listens to `onAuthStateChange`. On `INITIAL_SESSION` or `SIGNED_IN` it:

1. Calls `ensureMembership` to upsert the user into `quiniela_members`
2. Loads the user's picks, top-scorer prediction, and submission status

The `AuthContext` exposes: `user`, `loading`, `quinielaId`, `submitted`, `userPicks`, `topScorer`, `login`, `signup`, `logout`, `submitPredictions`.

### Data

`DataProvider` fetches matches (public) and leaderboard members (requires auth) from Supabase. It exposes `matches`, `members`, `getMember(userId)`, `refreshMembers`, and loading states.

### Supabase client

`src/lib/client.ts` exports a **singleton** client via `getClient()`. All queries and auth share the same instance — creating multiple clients breaks RLS because `auth.uid()` returns null on new instances that haven't inherited the session.

### Routing

`_index.tsx` redirects to `/rankings`. `App.tsx` redirects unauthenticated users to `/login`. All route files are thin wrappers; logic and UI live in Screen components.

## Database schema

### Tables

| Table | Purpose |
|---|---|
| `matches` | 72 WC2026 group-stage matches (seeded from football-data.org) |
| `profiles` | One row per auth user — `display_name`, `avatar_color` |
| `quiniela_members` | Leaderboard entry per user per quiniela |
| `predictions` | Score picks: `pick_home`, `pick_away` per `match_id` |
| `top_scorer_predictions` | Each user's golden boot pick |
| `prediction_submissions` | Existence = user has submitted (locks predictions) |
| `leaderboard_snapshots` | Cumulative points per user per match (sparkline history) |

### Key details

- `DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83"`
- `profiles.avatar_color` is NOT NULL (default `#02B906`)
- A `handle_new_user` trigger on `auth.users` inserts into `public.profiles` on signup
- RLS is enabled on all tables; `quiniela_members` uses a `SECURITY DEFINER` helper function (`get_my_quiniela_ids()`) to prevent recursion
- `matches.id` uses football-data.org match IDs for future sync

### Scoring

| Result | Points |
|---|---|
| Exact score | 5 pts |
| Correct winner/draw | 3 pts |
| Wrong | 0 pts |

## Match data

Group-stage matches are seeded from the **football-data.org API v4**:

```
GET https://api.football-data.org/v4/competitions/WC/matches?season=2026
X-Auth-Token: <token>
```

The API returns 104 matches; only the 72 `GROUP_STAGE` matches are stored. The tournament begins **June 11, 2026**. All matches start as `TIMED` with null scores.

## Team data

48 teams across 12 groups (A–L) are defined in `src/lib/mock-data.ts`. Team codes are 3-letter FIFA codes (e.g. `MEX`, `BRA`). Full names and brand colors are in `TEAM_FULL` and `TEAM_COLORS`.

## Supabase types

`src/lib/supabase.ts` is auto-generated — never edit it manually. Regenerate with:

```bash
pnpm supabase gen types typescript --project-id <ref> > src/lib/supabase.ts
```

Use `Tables<'tablename'>` from this file for row types in queries.
