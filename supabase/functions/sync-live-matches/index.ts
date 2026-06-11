// sync-live-matches — invoked by pg_cron (every 2 min, 16:00–06:58 UTC).
// Syncs live/just-finished matches from FIFA's live API (primary), falling
// back to football-data.org when FIFA is unreachable, has no match id, or
// returns a status we can't map. football-data's free tier proved unreliable
// on day 1 (2026-06-11: the MEX-RSA opener was stuck on TIMED at minute 33',
// then a later partial response reset the already-live row), so every write —
// from either source — goes through two safeguards that stop a stale source
// from rewinding a row:
//   1. STATUS_RANK guard: a source reporting a status behind what the row
//      already has is stale, and its write is skipped entirely.
//   2. Null pruning: null score/winner/duration values are dropped from the
//      payload, so a source that omits data another tick already stored can
//      never wipe it. `minute` is the exception — cleared explicitly when a
//      match finishes, kept (not overwritten) during half-time breaks.
// The trg_match_finished trigger on `matches` handles the leaderboard refresh
// when a match transitions to FINISHED, so this function only writes rows.
//
// ── FIFA → our schema translation ──────────────────────────────────────────
// Our columns use football-data.org vocabulary (what scoring.ts and the
// app's MatchStatus type expect); FIFA values are translated, never stored
// raw. Verified against the live MEX-RSA opener (2026-06-11) and finished
// 2018/2022 World Cup matches (incl. the ARG-FRA 2022 final: ET + penalties).
//
//   FIFA field                        → our column
//   MatchStatus 1 (not started)       → status 'TIMED'
//   MatchStatus 3 + Period 4 or 8     → status 'PAUSED' (half-time; 8 is the
//                                       assumed ET interval, unobserved)
//   MatchStatus 3 (otherwise)         → status 'IN_PLAY'
//   MatchStatus 0 (finished)          → status 'FINISHED'
//   MatchStatus anything else        → unknown — fall back to football-data
//   HomeTeam.Score / AwayTeam.Score   → score_*_regular during normal time;
//                                       score_*_et past regular time (FIFA's
//                                       Score includes ET and it exposes no
//                                       separate 90-minute score)
//   Home/AwayTeamPenaltyScore         → score_*_penalties (shootouts only)
//   ResultType 1 / 2 / 3 on finished  → duration 'REGULAR' /
//                                       'PENALTY_SHOOTOUT' / 'EXTRA_TIME'
//                                       ('REGULAR' while still in play)
//   Winner (FIFA team id, "43922";    → winner 'HOME_TEAM' / 'AWAY_TEAM' by
//     null while live or on a draw)     comparing to Home/AwayTeam.IdTeam;
//                                       null on a finished match → 'DRAW';
//                                       never stored before FINISHED
//   MatchTime ("46'" live, "" during  → minute "46" (apostrophe stripped);
//     breaks, "0'" once finished)       null once finished, kept on breaks
//   Period 3 = 1st half, 4 = half-time, 5 = 2nd half, 10 = full-time (all
//     observed); 6-9/11 unobserved — assumed ET/shootout phases, so a live
//     Period >= 6 routes Score to the _et columns. Verify at the first
//     knockout match that reaches extra time.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const FD_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const FIFA_URL = 'https://api.fifa.com/api/v3/live/football';
// FIFA's frontend API needs no auth, just browser-like headers.
const FIFA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.fifa.com',
};
const DAY_MS = 24 * 60 * 60 * 1000;

// TIMED < live < FINISHED. A source reporting a lower rank than the row
// already has is stale and must never downgrade it.
const STATUS_RANK: Record<string, number> = {
  SCHEDULED: 0,
  TIMED: 0,
  IN_PLAY: 1,
  PAUSED: 1,
  FINISHED: 2,
};

type FdScorePart = { home: number | null; away: number | null };
type FdMatch = {
  id: number;
  status: string;
  minute?: string | null;
  score: {
    winner: string | null;
    duration: string;
    fullTime: FdScorePart;
    regularTime?: FdScorePart;
    penalties?: FdScorePart;
  };
};

type Candidate = {
  id: number;
  status: string;
  utc_date: string;
  fifa_match_id: string | null;
};

type FifaTeamLive = { IdTeam: string | null; Score: number | null } | null;
type FifaLive = {
  MatchStatus: number;
  MatchTime: string | null;
  Period: number | null;
  Winner: string | null;
  ResultType: number;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  HomeTeam: FifaTeamLive;
  AwayTeam: FifaTeamLive;
};

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

// Safeguard 2: drop null/undefined fields so a source that omits data
// another tick already stored can never wipe it.
const pruneNulls = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined),
  );

function mapFifaStatus(f: FifaLive): string | null {
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

type FifaOutcome = {
  outcome: 'updated' | 'skipped' | 'fallback';
  error?: string;
};

async function syncFromFifa(
  supabase: SupabaseClient,
  candidate: Candidate,
  now: Date,
): Promise<FifaOutcome> {
  if (!candidate.fifa_match_id) {
    console.log(`match ${candidate.id}: no fifa_match_id, using football-data`);
    return { outcome: 'fallback' };
  }
  let f: FifaLive;
  try {
    const res = await fetch(
      `${FIFA_URL}/${candidate.fifa_match_id}?language=en`,
      { headers: FIFA_HEADERS },
    );
    if (!res.ok) {
      console.log(`match ${candidate.id}: FIFA responded ${res.status}, using football-data`);
      return { outcome: 'fallback' };
    }
    f = (await res.json()) as FifaLive;
  } catch (e) {
    console.log(`match ${candidate.id}: FIFA fetch failed (${e}), using football-data`);
    return { outcome: 'fallback' };
  }

  const status = mapFifaStatus(f);
  if (!status) {
    console.log(
      `match ${candidate.id}: unknown FIFA MatchStatus ${f.MatchStatus} (period ${f.Period}), using football-data`,
    );
    return { outcome: 'fallback' };
  }
  // Safeguard 1: FIFA behind what we already stored — let football-data
  // (which may be the source of the stored status) take this tick instead.
  if ((STATUS_RANK[status] ?? 0) < (STATUS_RANK[candidate.status] ?? 0)) {
    console.log(
      `match ${candidate.id}: FIFA status ${status} behind DB ${candidate.status}, using football-data`,
    );
    return { outcome: 'fallback' };
  }
  const live = status === 'IN_PLAY' || status === 'PAUSED';
  if (!live && status === candidate.status) {
    console.log(`match ${candidate.id}: FIFA status unchanged (${status}), skipping`);
    return { outcome: 'skipped' };
  }

  const home = f.HomeTeam?.Score ?? null;
  const away = f.AwayTeam?.Score ?? null;
  // Past regular time? Finished matches say so via ResultType; live ones
  // only via Period (>= 6 assumed ET/shootout — normal time tops out at 5).
  const pastRegular = status === 'FINISHED'
    ? f.ResultType >= 2
    : (f.Period ?? 0) >= 6;
  // Winner is only meaningful once the match is over — football-data was
  // observed flapping a premature winner mid-match, so never store one early.
  const winner = status !== 'FINISHED'
    ? null
    : f.Winner
      ? f.Winner === f.HomeTeam?.IdTeam
        ? 'HOME_TEAM'
        : f.Winner === f.AwayTeam?.IdTeam
          ? 'AWAY_TEAM'
          : null
      : 'DRAW';
  const duration = status !== 'FINISHED' || f.ResultType === 1
    ? 'REGULAR'
    : f.ResultType === 2
      ? 'PENALTY_SHOOTOUT'
      : 'EXTRA_TIME';
  // MatchTime carries the clock with a trailing apostrophe ("46'"); ours
  // stores it bare ("46"). Empty during breaks → pruned, last value kept.
  const minute = live ? f.MatchTime?.replace(/'/g, '') || null : null;

  console.log(
    `match ${candidate.id}: FIFA ${candidate.status} -> ${status}, ` +
      `score ${home}-${away}, period ${f.Period}, minute=${minute ?? 'null'}`,
  );

  const { error } = await supabase
    .from('matches')
    .update({
      status,
      ...pruneNulls({
        ...(pastRegular
          ? { score_home_et: home, score_away_et: away }
          : { score_home_regular: home, score_away_regular: away }),
        score_home_penalties: pastRegular ? f.HomeTeamPenaltyScore : null,
        score_away_penalties: pastRegular ? f.AwayTeamPenaltyScore : null,
        duration,
        winner,
        minute,
      }),
      ...(status === 'FINISHED' ? { minute: null } : {}),
      last_synced_at: now.toISOString(),
    })
    .eq('id', candidate.id);
  if (error) {
    return { outcome: 'skipped', error: `match ${candidate.id}: ${error.message}` };
  }
  return { outcome: 'updated' };
}

async function syncFromFd(
  supabase: SupabaseClient,
  candidate: Candidate,
  m: FdMatch | undefined,
  now: Date,
): Promise<{ updated: boolean; error?: string }> {
  if (!m) {
    console.log(`match ${candidate.id}: not found in football-data response`);
    return { updated: false };
  }
  // Safeguard 1: this is exactly how the day-1 reset happened — football-data
  // reported TIMED/nulls for a row FIFA had already marked live.
  if ((STATUS_RANK[m.status] ?? 0) < (STATUS_RANK[candidate.status] ?? 0)) {
    console.log(
      `match ${candidate.id}: football-data status ${m.status} behind DB ${candidate.status}, skipping`,
    );
    return { updated: false };
  }
  const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
  if (!live && m.status === candidate.status) {
    console.log(`match ${candidate.id}: football-data status unchanged (${m.status}), skipping`);
    return { updated: false };
  }
  console.log(
    `match ${candidate.id}: football-data ${candidate.status} -> ${m.status}, minute=${m.minute ?? 'null'}`,
  );

  const s = m.score;
  // fullTime is the running score while live and the final score (incl.
  // extra time) once done; regularTime holds the 90-minute score when ET
  // was played.
  const regular = s.regularTime ?? s.fullTime;
  const hasEt = s.duration && s.duration !== 'REGULAR';
  const { error } = await supabase
    .from('matches')
    .update({
      status: m.status,
      ...pruneNulls({
        score_home_regular: regular?.home,
        score_away_regular: regular?.away,
        score_home_et: hasEt ? s.fullTime?.home : null,
        score_away_et: hasEt ? s.fullTime?.away : null,
        score_home_penalties: s.penalties?.home,
        score_away_penalties: s.penalties?.away,
        duration: s.duration,
        // football-data has flapped a premature winner on a live match;
        // only trust it once the match is actually over.
        winner: m.status === 'FINISHED' ? s.winner : null,
        minute: live ? m.minute : null,
      }),
      ...(m.status === 'FINISHED' ? { minute: null } : {}),
      last_synced_at: now.toISOString(),
    })
    .eq('id', candidate.id);
  if (error) {
    return { updated: false, error: `match ${candidate.id}: ${error.message}` };
  }
  return { updated: true };
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  // Matches that kicked off in the last 6h (2-min lookahead for ones about to
  // start) and aren't recorded as finished. Empty set = no API call at all.
  const { data: candidates, error: candidatesError } = await supabase
    .from('matches')
    .select('id, status, utc_date, fifa_match_id')
    .neq('status', 'FINISHED')
    .lte('utc_date', new Date(now.getTime() + 2 * 60 * 1000).toISOString())
    .gte('utc_date', new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString());

  if (candidatesError) {
    console.log('candidates query error', candidatesError.message);
    return Response.json({ error: candidatesError.message }, { status: 500 });
  }
  console.log(`run at ${now.toISOString()}: ${candidates?.length ?? 0} candidate(s)`, candidates);
  if (!candidates || candidates.length === 0) {
    return Response.json({ updated: 0, message: 'no ongoing matches' });
  }

  const errors: string[] = [];
  let updated = 0;

  // Primary: FIFA, one request per candidate (rarely more than 2-3 live at
  // once). Candidates FIFA can't serve queue up for football-data.
  const fdQueue: Candidate[] = [];
  await Promise.all(
    (candidates as Candidate[]).map(async (candidate) => {
      const result = await syncFromFifa(supabase, candidate, now);
      if (result.error) errors.push(result.error);
      if (result.outcome === 'updated') updated++;
      else if (result.outcome === 'fallback') fdQueue.push(candidate);
    }),
  );

  // Fallback: one football-data request covers the whole queue (dateFrom/
  // dateTo only accept yyyy-MM-dd, so bracket today with ±1 day to be safe
  // across UTC midnight).
  if (fdQueue.length > 0) {
    const params = new URLSearchParams({
      season: '2026',
      dateFrom: dateOnly(new Date(now.getTime() - DAY_MS)),
      dateTo: dateOnly(new Date(now.getTime() + DAY_MS)),
    });
    const res = await fetch(`${FD_URL}?${params}`, {
      headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_DATA_KEY')! },
    });
    if (!res.ok) {
      console.log(`football-data.org responded ${res.status}`, await res.text());
      errors.push(`football-data.org responded ${res.status}`);
    } else {
      const payload = await res.json();
      const apiMatches = new Map<number, FdMatch>(
        ((payload.matches ?? []) as FdMatch[]).map((m) => [m.id, m]),
      );
      console.log(
        `football-data fallback for ${fdQueue.length} candidate(s), fetched ${apiMatches.size} match(es)`,
      );
      await Promise.all(
        fdQueue.map(async (candidate) => {
          const result = await syncFromFd(
            supabase,
            candidate,
            apiMatches.get(candidate.id),
            now,
          );
          if (result.error) errors.push(result.error);
          if (result.updated) updated++;
        }),
      );
    }
  }

  return Response.json(
    {
      updated,
      candidates: candidates.length,
      fdFallbacks: fdQueue.length || undefined,
      errors: errors.length ? errors : undefined,
    },
    { status: errors.length ? 500 : 200 },
  );
});
