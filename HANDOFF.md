# Handoff: Knockout-stage rollout + PENDING.md cleanup

Written 2026-06-28 to resume this work in a new Claude session on a machine that has real Supabase access to this project (org `xjzjnuyvziyhhumtiitp`, project ref `ljnfquqjvlbiynzxdedq`). The session that wrote this had no deploy access at all (Supabase MCP was scoped to an unrelated org "Akios", and there was no local `supabase login` session) — every code change below is written to disk and typechecked, but **nothing has been deployed**. Read-only checks (REST API with the public anon key, and FIFA's public calendar API) were used throughout to verify live state without needing write access.

## Urgency

Today (2026-06-28) is matchday for the first Round-of-32 game (kickoff 19:00 UTC). As of this writing:
- Group stage is **fully finished** (72/72 `FINISHED`).
- FIFA's calendar API (`https://api.fifa.com/api/v3/calendar/matches?idseason=285023&count=500`, no auth, browser-like headers) already reports **all 16 Round-of-32 matchups fully resolved** (e.g. `ARG vs CPV`, `BRA vs JPN`, `MEX vs ECU`...).
- Our `matches` table still has **every Round-of-32 row at `home_team_code`/`away_team_code` = null**, because the sync function that would fill these in (`sync-knockout-bracket`) has never been deployed.
- Deploying the items in "Deployment runbook" below should be the *first* priority in the new session — once live, the cron will resolve the Round of 32 within ~15 minutes and the knockout prediction UI (already built, just not live) becomes usable before kickoff.

## What's already built, coded, typechecked — just not deployed

Two prior rounds of work in this repo (not yet committed — `git status --short` shows them as modified/untracked). The user said they'd push these to the repo themselves; verify with `git status`/`git log` in the new session before assuming they're still uncommitted.

**Round 1 — knockout predictions + scoring fix:**
- `supabase/functions/sync-knockout-bracket/index.ts` (new) — polls FIFA's calendar API, fills in `home_team_code`/`away_team_code` on knockout matches once FIFA resolves them. Team-code alias: FIFA uses `URU`, we use `URY` for Uruguay (the only mismatch across all 48 teams, confirmed by diffing).
- `supabase/migrations/20260628_sync_knockout_bracket_cron.sql` (new) — registers that function on a `*/15 * * * *` cron (24/7, not match-hours-only — bracket resolution isn't tied to kickoffs).
- `supabase/migrations/20260628_fix_knockout_scoring.sql` (new) — fixes a bug in `prediction_points_v2` (it compared a team-code penalties pick directly against `'HOME_TEAM'`/`'AWAY_TEAM'` — added `p_home_team_code`/`p_away_team_code` params to translate first) and wires `prediction_points_v2` + `bracket_bonus_points` into `refresh_quiniela_leaderboard` (full body re-derived from `20260611_leaderboard_unique_rank.sql`, the bonus only applies when the main result scored 0 on a knockout match). Has verification SQL in trailing comments — **run those before trusting it against real data**.
- Frontend: `src/components/PredictionEntryForm.tsx` (+ `.css`) now renders a knockout section below group stage — score predictions + a penalty-winner picker (shown when your own pick is a draw) for matches with known teams, and a "guess the matchup" picker (two team `<select>`s, sourced from `getAliveTeams()`) for matches still TBD, writing to the previously-unused `bracket_predictions` table. Threaded through `src/lib/auth-context.tsx`, `src/lib/queries.ts`, `src/components/ProfileScreen.tsx`, `src/locales/{en,es}.json`.

**Round 2 — availability gating + two prediction modalities:**
- `supabase/migrations/20260628_add_knockout_mode.sql` (new) — adds `quinielas.knockout_mode` (`'ONE_SHOT'` | `'STAGE_BY_STAGE'`, default `'STAGE_BY_STAGE'`), re-creates `get_active_membership`/`set_active_quiniela`/`join_quiniela_by_code` (full bodies preserved from `20260623_active_quiniela.sql`) to return it. **The production/default quiniela's value is deliberately left at the column default** — the user explicitly said not to assume a mode for it; they'll set it themselves when ready.
- `src/lib/helpers.ts`: `isStageFullyResolved(matches, stage)` and `getCurrentKnockoutStage(matches)`. The knockout section as a whole only renders once **every** Round-of-32 match has both teams resolved (not row-by-row as the cron trickles them in). `ONE_SHOT` mode shows every knockout stage at once (using the matchup-guess picker for undetermined future rounds); `STAGE_BY_STAGE` shows only the current stage (the earliest one not yet fully `FINISHED`) and never shows the matchup-guess picker at all.
- Same frontend files as round 1, extended further (`PredictionEntryForm.tsx`, `auth-context.tsx`, `queries.ts`, `ProfileScreen.tsx`, both locale files).

**Known rough edge in both rounds**: `src/lib/supabase.ts` is auto-generated (`pnpm supabase:types`) and was never regenerated against the live DB (no access). `queries.ts` and `auth-context.tsx` have small local type casts (search for `knockout_mode isn't in the generated` comments) bridging the gap until someone runs `pnpm supabase:types` after the migrations are live. Safe to leave, but worth cleaning up once types are regenerated.

`pnpm typecheck` is clean as of this writing. Vite module-transform sanity-checked (dev server requested each touched file, got 200s, no compile errors) — **never actually browser-tested with a real login**, since no browser automation tool was available in that session.

## PENDING.md — verified current state, not yet updated in the file

The user confirmed items 2 and 5 are already resolved (their own knowledge, not independently re-derived here — trust it). Item 3 was independently verified resolved by re-reading the code. Item 1 is the round-1 scoring fix above. **`PENDING.md` itself was never edited to reflect any of this** — do that in the new session once the rest below is done.

1. ~~Wire knockout scoring into the leaderboard~~ — done in round 1 above, pending deploy.
2. ~~Guard against a premature FINISHED~~ — user confirmed resolved.
3. ~~Post-final correction window~~ — independently verified resolved: `sync-live-matches/index.ts`'s `RECHECK_WINDOW_MS` (5 min) safeguard + `20260617_finished_match_correction_trigger.sql` already keep just-finished matches in the candidate set and re-trigger the leaderboard refresh on a correction (this is literally the IRQ-NOR day-1 incident the code comments describe).
4. **Surface stale live data in the app — still not implemented.** Design (not yet coded):
   - `last_synced_at` exists in `matches` but isn't selected by `fetchMatches()` ([src/lib/queries.ts](src/lib/queries.ts)) or present on `Match` ([src/lib/types.ts](src/lib/types.ts)). Add it to both.
   - New helper in `helpers.ts`: `isLiveDataStale(match, now)` → `match.status === 'live' && match.lastSyncedAt && now - Date.parse(match.lastSyncedAt) > 5*60*1000` (5 min, matching `RECHECK_WINDOW_MS` for consistency).
   - Small dimmed hint/badge in `MatchCard.tsx`/`MatchDetail.tsx` when stale. Needs a periodic re-render (e.g. a 30s `setInterval` tick) since a *stuck* sync produces no new data to trigger a re-render otherwise.
   - New locale key in both `en.json`/`es.json`.
5. ~~Verify FIFA ET-phase enum values at the first knockout ET match~~ — user confirmed resolved.
6. **Fix venue data on 14 knockout matches — fully diagnosed, not yet coded.** It's a 3-way-plus rotation of correct `(venue, venue_city, venue_country)` triples across the wrong rows (e.g. match `537423` currently holds Boston's data, which belongs on `537415`, whose data belongs on `537418`, whose data belongs back on `537423`). Root-caused by cross-referencing each `fifa_match_id` against FIFA's calendar API's `Stadium.CityName` (⚠️ ignore `Stadium.Name` — it's FIFA's generic "X Stadium" placeholder, not the real stadium name) against a canonical city→venue map built from the 72 *uncorrupted* group-stage rows. **The exact fix, ready to turn into a migration** (`UPDATE matches SET venue = ..., venue_city = ..., venue_country = ... WHERE id = ...`, one `CASE id WHEN` block or 14 individual statements):

   | id | correct city | venue | country |
   |---|---|---|---|
   | 537423 | Houston | NRG Stadium | USA |
   | 537415 | Boston | Gillette Stadium | USA |
   | 537418 | Monterrey | Estadio BBVA | MEX |
   | 537424 | Dallas | AT&T Stadium | USA |
   | 537416 | New York New Jersey | MetLife Stadium | USA |
   | 537422 | Seattle | Lumen Field | USA |
   | 537421 | San Francisco Bay Area | Levi's Stadium | USA |
   | 537420 | Los Angeles | SoFi Stadium | USA |
   | 537419 | Toronto | BMO Field | CAN |
   | 537428 | Dallas | AT&T Stadium | USA |
   | 537427 | Miami | Hard Rock Stadium | USA |
   | 537430 | Kansas City | Arrowhead Stadium | USA |
   | 537376 | Houston | NRG Stadium | USA |
   | 537375 | Philadelphia | Lincoln Financial Field | USA |

   Suggested filename: `supabase/migrations/20260629_fix_knockout_venues.sql`. Verify post-deploy by re-running the diff (fetch our knockout rows via REST, fetch FIFA's calendar, compare per `fifa_match_id` by city — same approach used to diagnose it).
7. **Tests for the sync translation logic — still nothing, not yet coded.** No test runner exists anywhere in the repo. **Important finding**: `sync-live-matches/index.ts` runs under Deno, but this machine had no `deno` binary, while **Node 22.20 runs `.test.ts` files directly via `node --test` with zero new dependencies and zero config** (verified live in that session — a throwaway TS test file using `node:test`/`node:assert/strict` ran correctly with no setup). Plan:
   - Extract pure logic into a new `supabase/functions/sync-live-matches/translate.ts` — **no `Deno.*` globals, no `npm:` specifiers**, plain TS so it's importable from both the Deno function at runtime and Node for tests: `STATUS_RANK`, `mapFifaStatus` (move as-is), `pruneNulls` (move as-is), new `isStale(newStatus, oldStatus)` (extracted from the inline `STATUS_RANK[...] < STATUS_RANK[...]` comparisons used in both `syncFromFifa` and `syncFromFd`), new `resolveFifaWinner(status, fifaWinnerId, homeTeamId, awayTeamId)` (extracted from the inline "never store a winner before FINISHED" computation in `syncFromFifa`).
   - `index.ts` imports these from `./translate.ts` instead of defining them inline — behavior-preserving refactor only, no logic changes. **Redeploy `sync-live-matches` after this refactor** (current deployed version is the pre-refactor inline code — functionally identical, but won't match the repo until redeployed).
   - New `supabase/functions/sync-live-matches/translate.test.ts` (`node:test` + `node:assert/strict`) covering: `mapFifaStatus`'s full documented mapping table (see the big comment block at the top of `index.ts`), `isStale` (the day-1 stale-`TIMED`-after-kickoff regression), `pruneNulls` (the partial-response-with-nulls regression), `resolveFifaWinner` (the premature-mid-match-winner regression — must never resolve before `FINISHED`).
   - Run `node --test supabase/functions/sync-live-matches/translate.test.ts` to confirm before calling it done — don't just write tests and assume they pass.

## Deployment runbook (do this first, time-sensitive)

Run in this order, on a machine/session with real access to org `xjzjnuyvziyhhumtiitp`:

```bash
supabase login                                      # or: supabase login --token <PAT from dashboard/account/tokens>
supabase link --project-ref ljnfquqjvlbiynzxdedq
```

1. Apply migrations (`supabase db push`, or paste each into the SQL Editor in this exact order):
   - `supabase/migrations/20260628_sync_knockout_bracket_cron.sql`
   - `supabase/migrations/20260628_fix_knockout_scoring.sql`
   - `supabase/migrations/20260628_add_knockout_mode.sql`
   - `supabase/migrations/20260629_fix_knockout_venues.sql` (once written — see item 6 above)
2. Deploy functions:
   ```bash
   supabase functions deploy sync-knockout-bracket
   supabase functions deploy sync-live-matches   # only after the translate.ts refactor (item 7) lands
   ```
3. Regenerate types: `pnpm supabase:types` — then go remove the temporary casts mentioned above (search `knockout_mode isn't in the generated`).
4. Verify:
   ```bash
   curl -s "https://ljnfquqjvlbiynzxdedq.supabase.co/rest/v1/matches?select=id,home_team_code,away_team_code&stage=eq.LAST_32" \
     -H "apikey: sb_publishable_Y-OED_liS_HdzZ_HSEkmrQ_4eYLERS4"
   # expect all 16 rows populated with real team codes within ~15 min of the cron's first tick
   curl -s -o /dev/null -w "%{http_code}\n" "https://ljnfquqjvlbiynzxdedq.supabase.co/functions/v1/sync-knockout-bracket"
   # expect 401 (deployed, needs auth) not 404 (not deployed)
   ```
5. Run the verification SQL in the trailing comments of `20260628_fix_knockout_scoring.sql` (group-stage parity + penalties-fix sanity checks) against real data before trusting it.
6. Decide and set `quinielas.knockout_mode` for the production quiniela explicitly (currently sitting at the `STAGE_BY_STAGE` default) — this was deliberately left to the user, not assumed.
7. Browser-test the actual prediction UI once deployed (login, `/profile`) — this was never done end-to-end in either prior session due to lack of browser tooling.

## Loose end

`package.json`'s version bumped from `1.4.0` to `1.4.1` incidentally during a `pnpm install`/`pnpm dev` run in this session — not an intentional change, just noting it so it isn't a mystery in `git diff`.
