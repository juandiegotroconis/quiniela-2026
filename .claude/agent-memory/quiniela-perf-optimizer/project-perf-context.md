---
name: project-perf-context
description: Performance audit findings for quiniela-2026 — identified hotspots, missing indexes, N+1 patterns, and caching gaps
metadata:
  type: project
---

First full performance audit completed 2026-05-28.

**Key findings (in priority order):**

1. `fetchUserAvatarColor` is a redundant standalone query — avatar_color is already returned by `fetchMembers` (quiniela_members). At 100 users it adds an unnecessary extra round-trip on every login.

2. `fetchMembers` in `data-context.tsx` always fetches ALL `leaderboard_snapshots` for the quiniela upfront (no lazy loading). With 100 members × 72 match snapshots = 7,200 rows on every load, on every tab focus (SIGNED_IN re-fires).

3. `MatchDetail` fetches `fetchMatchPredictions` inside a `useEffect` that lists `members` as a dependency. Any `members` state update (e.g., avatar color change) re-triggers this fetch even when the match hasn't changed.

4. `LeaderboardScreen` client-sorts `members` even though `fetchMembers` already queries with `.order('rank')`. Wasted CPU and a misleading pattern.

5. No Realtime subscriptions anywhere — matches and members are loaded once at mount with no mechanism to update live scores or leaderboard without a full page refresh.

6. `DataProvider` (data-context.tsx) re-fetches `members` whenever `user.id` changes. Since `AuthProvider` can emit multiple state changes during login flow (setUser called, then avatarColor updated via setUser), this may double-trigger if user object identity changes.

7. `PlayerProfile` calls `fetchUserPicks(userId, quinielaId)` on every render for other users — no caching between visits to `/player/:id`.

8. `ensureMembership` in queries.ts does a SELECT then conditionally an INSERT (two round-trips). Should be a single upsert with `onConflict: 'user_id,quiniela_id' ignoreDuplicates: true`.

9. `fetchQuinielaSettings` uses `select("is_updatable, variant" as any)` — type cast escape hatch indicates `variant` column may not be in generated types; worth watching for schema drift.

10. No DB index confirmed on `players.name` — `searchPlayers` uses `search_players_detailed` RPC so depends on whatever the function's internal strategy is.

**Supabase project ref:** ljnfquqjvlbiynzxdedq (not accessible via current MCP session — different Supabase account).

**Why:** This context is needed for follow-up optimization work during the live tournament (starts 2026-06-11).

**How to apply:** Use these findings as the starting checklist for any data-layer work. Do not re-audit from scratch.
