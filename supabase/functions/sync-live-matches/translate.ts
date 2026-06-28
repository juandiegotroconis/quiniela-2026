// Pure FIFA → football-data.org translation logic for sync-live-matches,
// extracted from index.ts so it can be unit-tested under Node (`node --test`)
// without the Deno runtime. Keep this file free of any `Deno.*` globals and
// `npm:` specifiers — plain TS, importable from both the Deno function at
// runtime and Node for tests.

// TIMED < live < FINISHED. A source reporting a lower rank than the row
// already has is stale and must never downgrade it.
export const STATUS_RANK: Record<string, number> = {
  SCHEDULED: 0,
  TIMED: 0,
  IN_PLAY: 1,
  PAUSED: 1,
  FINISHED: 2,
};

// Translates FIFA's MatchStatus/Period into our football-data status
// vocabulary, or null for an enum value we can't map (caller falls back to
// football-data). Period 4 = half-time, 8 = assumed ET interval (unobserved).
export function mapFifaStatus(
  f: { MatchStatus: number; Period: number | null },
): string | null {
  switch (f.MatchStatus) {
    case 0:
      return 'FINISHED';
    case 1:
      return 'TIMED';
    case 3:
      return f.Period === 4 || f.Period === 8 ? 'PAUSED' : 'IN_PLAY';
    default:
      return null;
  }
}

// Safeguard 2: drop null/undefined fields so a source that omits data another
// tick already stored can never wipe it.
export const pruneNulls = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined),
  );

// Safeguard 1: true when `newStatus` is behind `oldStatus` in the
// TIMED < live < FINISHED ordering — i.e. the reporting source is stale and
// must not downgrade the row.
export function isStale(newStatus: string, oldStatus: string): boolean {
  return (STATUS_RANK[newStatus] ?? 0) < (STATUS_RANK[oldStatus] ?? 0);
}

// Resolves FIFA's Winner (a team id, or null) to our
// 'HOME_TEAM' / 'AWAY_TEAM' / 'DRAW' vocabulary. A winner is only meaningful
// once the match is FINISHED — never resolved before then (football-data was
// observed flapping a premature mid-match winner). Returns null while not
// finished, or when a finished match's winner id matches neither side.
export function resolveFifaWinner(
  status: string,
  fifaWinnerId: string | null,
  homeTeamId: string | null | undefined,
  awayTeamId: string | null | undefined,
): string | null {
  if (status !== 'FINISHED') return null;
  if (!fifaWinnerId) return 'DRAW';
  if (fifaWinnerId === homeTeamId) return 'HOME_TEAM';
  if (fifaWinnerId === awayTeamId) return 'AWAY_TEAM';
  return null;
}
