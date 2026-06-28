# Pending

Outstanding work items. Last updated: 2026-06-28 (all prior items resolved — see history below).

## Open

- **Set `quinielas.knockout_mode` per quiniela.** All quinielas default to `STAGE_BY_STAGE` (migration `20260628_add_knockout_mode.sql`). This flag now fully governs knockout entry (which stages open + the deadline) — `is_updatable` no longer gates knockout. Set `ONE_SHOT` where wanted:
  `update quinielas set knockout_mode = '<MODE>' where id = '<quiniela_id>';`
- Knockout entry is now self-governing by deadline (see "Knockout prediction window" below) — no manual `is_updatable` toggling needed to open/close it.

## Knockout prediction window (2026-06-28)

Knockout predictions are gated by `knockout_mode` + a stage **deadline** (the first kickoff of the relevant stage), independent of `is_updatable` (which now governs only GROUP_STAGE + top-scorer entry):
- **Server**: `public.is_prediction_open(match_id, quiniela_id)` (migration `20260628_knockout_deadline_rls.sql`) — group → `is_updatable`; knockout → R32 resolved, then ONE_SHOT (open until first R32 kickoff) / STAGE_BY_STAGE (open until the current stage's first kickoff). Wired into the `predictions` + `bracket_predictions` write policies. Verified live: group=false, R32=true, R16=false for the default quiniela.
- **Client**: `getKnockoutEntryDeadline` / `isKnockoutEntryOpen` / `isPredictionStageLocked` (helpers.ts). A gold deadline **banner** (App.tsx, `BANNER_KNOCKOUT_*`) names the deadline per mode and routes to /profile. The form shows whenever knockout is open (`ProfileScreen.showForm = isUpdatable || knockoutOpen`); a stage's inputs go read-only once its deadline passes ("Locked" badge); knockout-only saves are filtered to open stages so they don't trip the still-`is_updatable`-gated group/top-scorer policies.

## Resolved (2026-06-28)

1. **Knockout scoring wired into the leaderboard** — `20260628_fix_knockout_scoring.sql` applied. `prediction_points_v2` penalties-winner bug fixed (added `p_home_team_code`/`p_away_team_code` to translate the team-code pick before comparing to `winner`); `refresh_quiniela_leaderboard` now uses v2 + `bracket_bonus_points`. Verified live: 5328/5328 group-stage predictions match the old `prediction_points` (zero diff), penalty fix returns 5/4 as designed.
2. **Premature-FINISHED guard** — covered by `sync-live-matches`'s `STATUS_RANK` + recheck-window safeguards (already deployed).
3. **Post-final correction window** — `RECHECK_WINDOW_MS` (5 min) + `20260617_finished_match_correction_trigger.sql`, already deployed.
4. **Stale live data surfaced in the app** — `matches.last_synced_at` now flows through `fetchMatches`/`Match`; `isLiveDataStale` (`helpers.ts`) + `useNowTick` shared 30s ticker drive a "Live updates delayed" hint in `MatchCard`/`MatchDetail` (locale key `MATCH_CARD_STATUS_STALE`).
5. **FIFA ET-phase enum values** — confirmed resolved (will be re-observed naturally at the first knockout match that reaches extra time; the `Period >= 6` → `_et` assumption stands until then).
6. **Knockout venue corruption (14 rows)** — `20260629_fix_knockout_venues.sql` applied. Each row's correct `(venue, venue_city, venue_country)` re-derived from FIFA's calendar `Stadium.CityName` per `fifa_match_id`, mapped to our canonical city strings; all 14 verified against FIFA post-fix.
7. **Tests for the sync translation logic** — pure logic extracted to `supabase/functions/sync-live-matches/translate.ts` (`mapFifaStatus`, `pruneNulls`, `isStale`, `resolveFifaWinner`, `STATUS_RANK`) and covered by `translate.test.ts` (`node:test`). Run with `pnpm test` (5 tests, all passing). `sync-live-matches` redeployed (v18) importing from `translate.ts`.

### Also done this session
- `sync-knockout-bracket` Edge Function deployed + `*/15` cron registered (`20260628_sync_knockout_bracket_cron.sql`); triggered once manually — all 16 Round-of-32 matchups resolved.
- `src/lib/supabase.ts` regenerated against the live DB (now includes `knockout_mode`); temporary type casts removed from `queries.ts` / `auth-context.tsx`.
