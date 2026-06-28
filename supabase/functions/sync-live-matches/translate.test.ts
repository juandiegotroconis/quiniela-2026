// Unit tests for the pure FIFA → football-data translation logic.
// Runs under Node with zero dependencies and zero config:
//   node --test supabase/functions/sync-live-matches/translate.test.ts
// (The function itself runs under Deno, but these helpers are plain TS with
// no Deno.* globals so Node's built-in test runner can import them directly.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_RANK,
  mapFifaStatus,
  pruneNulls,
  isStale,
  resolveFifaWinner,
} from './translate.ts';

test('mapFifaStatus covers the documented mapping table', () => {
  // MatchStatus 0 = finished, 1 = not started, 3 = in play (Period-dependent).
  assert.equal(mapFifaStatus({ MatchStatus: 0, Period: 10 }), 'FINISHED');
  assert.equal(mapFifaStatus({ MatchStatus: 1, Period: null }), 'TIMED');
  assert.equal(mapFifaStatus({ MatchStatus: 3, Period: 3 }), 'IN_PLAY'); // 1st half
  assert.equal(mapFifaStatus({ MatchStatus: 3, Period: 5 }), 'IN_PLAY'); // 2nd half
  assert.equal(mapFifaStatus({ MatchStatus: 3, Period: 4 }), 'PAUSED'); // half-time
  assert.equal(mapFifaStatus({ MatchStatus: 3, Period: 8 }), 'PAUSED'); // assumed ET interval
  // Unknown MatchStatus → null → caller falls back to football-data.
  assert.equal(mapFifaStatus({ MatchStatus: 2, Period: null }), null);
  assert.equal(mapFifaStatus({ MatchStatus: 99, Period: null }), null);
});

test('isStale: a status behind what we stored never downgrades the row', () => {
  // The day-1 regression: football-data reported TIMED for an already-live row.
  assert.equal(isStale('TIMED', 'IN_PLAY'), true);
  assert.equal(isStale('IN_PLAY', 'FINISHED'), true);
  assert.equal(isStale('TIMED', 'FINISHED'), true);
  // Same or forward progress is not stale.
  assert.equal(isStale('IN_PLAY', 'IN_PLAY'), false);
  assert.equal(isStale('IN_PLAY', 'TIMED'), false);
  assert.equal(isStale('FINISHED', 'IN_PLAY'), false);
  // PAUSED and IN_PLAY share a rank (both "live"), so neither is stale vs the other.
  assert.equal(isStale('PAUSED', 'IN_PLAY'), false);
  assert.equal(isStale('IN_PLAY', 'PAUSED'), false);
  // Unknown statuses default to rank 0.
  assert.equal(isStale('WHATEVER', 'FINISHED'), true);
  assert.equal(STATUS_RANK.FINISHED, 2);
});

test('pruneNulls drops null/undefined but keeps falsy-but-present values', () => {
  // The partial-response regression: a source omitting fields must not wipe
  // values another tick already stored.
  assert.deepEqual(
    pruneNulls({ a: 1, b: null, c: undefined, d: 0 }),
    { a: 1, d: 0 },
  );
  // 0 and empty string are real values and must survive.
  assert.deepEqual(pruneNulls({ score: 0, minute: '' }), { score: 0, minute: '' });
  assert.deepEqual(pruneNulls({ x: null }), {});
});

test('resolveFifaWinner never resolves a winner before FINISHED', () => {
  // The premature-mid-match-winner regression — must always be null while live.
  assert.equal(resolveFifaWinner('IN_PLAY', '43922', '43922', '43950'), null);
  assert.equal(resolveFifaWinner('PAUSED', '43922', '43922', '43950'), null);
  assert.equal(resolveFifaWinner('TIMED', null, '43922', '43950'), null);
});

test('resolveFifaWinner maps a finished match to our vocabulary', () => {
  assert.equal(resolveFifaWinner('FINISHED', '43922', '43922', '43950'), 'HOME_TEAM');
  assert.equal(resolveFifaWinner('FINISHED', '43950', '43922', '43950'), 'AWAY_TEAM');
  // No winner id on a finished match → draw.
  assert.equal(resolveFifaWinner('FINISHED', null, '43922', '43950'), 'DRAW');
  // Winner id matching neither side (shouldn't happen) → null, not a wrong side.
  assert.equal(resolveFifaWinner('FINISHED', '99999', '43922', '43950'), null);
});
