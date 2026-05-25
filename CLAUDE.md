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

**Routing** (`app/routes.ts`): thin route files that just render a Screen component and export a `meta()` function. `_index.tsx` redirects to `/rankings`. Routes: `/login`, `/rankings`, `/matches`, `/groups`, `/profile`.

**Auth** (`app/lib/auth-context.tsx`): client-side only. `AuthProvider` stores user, match picks, top-scorer pick, and submission status in `localStorage` under `quiniela-*` keys. `root.tsx` wraps the entire app in `AuthProvider` and redirects unauthenticated users to `/login`. The "submitted" flag gates whether the predictions banner is shown.

**Data** (`app/lib/mock-data.ts`): all data is static mock data — 48 teams across 12 groups (A–L), 72 group-stage matches, 15 players with rankings, and per-match predictions. `ME_ID = 5` is the constant that identifies the logged-in user in the player list. Match IDs correspond to football-data.org API IDs for future real-data integration.

**Components**: each component has a co-located `.css` file (e.g. `TopNav.tsx` / `TopNav.css`). BEM-like class naming convention (`block__element--modifier`).

**Styling**: dark theme only. Design tokens live in `app/styles/variables.css` as CSS custom properties (`--surface-*`, `--fg-*`, `--border-*`, `--color-*`, etc.). Two fonts: `Oswald` (display/headings, loaded from `/public/fonts/`) and `Noto Sans` (body, Google Fonts). Icons via `@iconify/react`.

**Helpers** (`app/lib/helpers.ts`): shared utility functions.

## Key conventions

- Route files are thin wrappers; business logic and UI live in Screen components under `app/components/`.
- Always use CSS variables from `variables.css` for colors, spacing radii, and typography — avoid hardcoded values.
- Team codes are 3-letter FIFA codes (e.g. `MEX`, `BRA`). Full names and colors are in `TEAM_FULL` and `TEAM_COLORS` in `mock-data.ts`.
