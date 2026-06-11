# Pending

Outstanding work items, in priority order. Last updated: 2026-06-11.

## 1. Wire knockout scoring into the leaderboard — deadline: before the first knockout match (June 28)

`refresh_quiniela_leaderboard` still scores with the old `prediction_points`, which has no knockout rules (no ET-score handling, no 5/4 penalty-draw split, no bracket bonus). The draft `prediction_points_v2` (migration `20260611_prediction_points_v2.sql`) implements them but is **not wired in**, and it has a confirmed bug:

- **Bug**: it compares `p_pick_penalties_winner = p_winner` directly, but picks store a team code (`'MEX'`) while `winner` stores `'HOME_TEAM'`/`'AWAY_TEAM'`. The function doesn't receive the match's team codes, so it can't translate — the "correct penalties pick" 5-point case can never fire; everyone with an exact ET-draw pick would get 4. Fix the signature like the old function (add `p_home_team_code`/`p_away_team_code` params) and translate before comparing.
- Wire it into `refresh_quiniela_leaderboard`, falling back to `bracket_bonus_points` when `prediction_points_v2` returns 0 on a knockout match (see the migration's header comment).
- Verify against the group stage: v2 must reproduce the already-computed group-stage points exactly (confirmed identical for group-stage inputs as of 2026-06-11, re-verify after the fix).

## 2. Guard against a premature FINISHED

`trg_match_finished` fires once and the match leaves the sync candidate set forever — a source flapping `FINISHED` mid-match (football-data sent flapping partial data on day 1) would permanently freeze a wrong result and lock the leaderboard to it. Add a sanity check in `sync-live-matches`: refuse `FINISHED` before kickoff + ~100 min (group stage) / ~155 min (knockout), from either source.

## 3. Post-final correction window

Once a match is `FINISHED` it is never re-fetched, so an official score correction never lands. Keep recently-finished matches (e.g. within 15 min of finishing) in the candidate set, and re-run `refresh_quiniela_leaderboard(quiniela_id, match_id)` if the stored score actually changed. Largely covers #2 as well.

## 4. Surface stale live data in the app

If both APIs fail mid-match, pg_cron just collects 500s silently. Lightest fix: when a match is `IN_PLAY` but `last_synced_at` is older than ~5 min, show a "live data delayed" hint in `MatchCard`/`MatchDetail`.

## 5. Verify FIFA ET-phase enum values at the first knockout ET match

`Period` values 6–9/11 and live-ET behavior are documented assumptions in `sync-live-matches/index.ts` (normal time tops out at Period 5; `>= 6` is assumed ET/shootout and routes the score to the `_et` columns). Confirm against FIFA's live endpoint the first time a knockout match goes to extra time, and correct the mapping if needed.

## 6. Fix venue data on 14 knockout matches

14 of the 32 knockout rows have wrong `venue`/`venue_city` (off by a few slots — e.g. match `537423` is tagged Boston but is in Houston). Cross-reference FIFA's calendar API (`api.fifa.com/api/v3/calendar/matches?idseason=285023`) `Stadium`/`CityName` per `fifa_match_id` against migrations 9–10. Doesn't affect `fifa_match_id` (joined on kickoff time).

## 7. Tests for the sync translation logic

`mapFifaStatus`, the FIFA→schema translation, and the anti-reset guards in `sync-live-matches/index.ts` are pure-function-shaped but untested (no test suite exists in the project at all). Extract and cover them, including the day-1 regression cases: stale `TIMED` after kickoff, partial response with nulls, premature mid-match winner.
