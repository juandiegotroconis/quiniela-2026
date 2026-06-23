// sync-live-matches — invoked by pg_cron (every minute, 16:00–06:58 UTC).
// Syncs live/just-finished matches from FIFA's live API (primary), falling
// back to football-data.org when FIFA is unreachable, has no match id, or
// returns a status we can't map. It also syncs the goal/card/substitution feed
// for live/finished matches from FIFA's timeline endpoint into match_events
// (see syncEventsFromFifa) — FIFA-only, football-data has no event feed. football-data's free tier proved unreliable
// on day 1 (2026-06-11: the MEX-RSA opener was stuck on TIMED at minute 33',
// then a later partial response reset the already-live row), so every write —
// from either source — goes through three safeguards:
//   1. STATUS_RANK guard: a source reporting a status behind what the row
//      already has is stale, and its write is skipped entirely.
//   2. Null pruning: null score/winner/duration values are dropped from the
//      payload, so a source that omits data another tick already stored can
//      never wipe it. `minute` is the exception — cleared explicitly when a
//      match finishes, kept (not overwritten) during half-time breaks.
//   3. FINISHED recheck window: a source can flag a match FINISHED a beat
//      before its score reflects a very-late goal (observed 2026-06-16:
//      IRQ-NOR posted FINISHED 1-3, corrected to 1-4 a tick later) — a row
//      stays a candidate for RECHECK_WINDOW_MS after its FINISHED write so a
//      correction can still land, then is excluded from polling for good.
//      Each such correction is logged to `match_corrections` (logCorrection)
//      so the frontend can show a "this result was corrected" banner.
// The trg_match_finished trigger on `matches` calls refresh_quiniela_leaderboard
// whenever a match transitions to FINISHED *or* its score/winner/duration
// changes while already FINISHED (the latter covers a recheck-window
// correction), so this function only writes rows.
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
// FIFA's ordered event feed (goals/cards/subs/...) — same host, no auth.
const FIFA_TIMELINES_URL = 'https://api.fifa.com/api/v3/timelines';
// FIFA's frontend API needs no auth, just browser-like headers.
const FIFA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.fifa.com',
};
const DAY_MS = 24 * 60 * 60 * 1000;
// How long a match stays a candidate after being marked FINISHED, to catch
// a source correcting its score a tick or two behind the final whistle.
const RECHECK_WINDOW_MS = 5 * 60 * 1000;

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
  home_team_code: string | null;
  away_team_code: string | null;
  score_home_regular: number | null;
  score_away_regular: number | null;
  score_home_et: number | null;
  score_away_et: number | null;
  score_home_penalties: number | null;
  score_away_penalties: number | null;
  winner: string | null;
  duration: string | null;
  last_synced_at: string | null;
};

type FifaLocalized = { Locale: string; Description: string }[] | null;
type FifaPlayer = {
  IdPlayer: string;
  PlayerName: FifaLocalized;
  ShortName: FifaLocalized;
};
type FifaTeamLive =
  | {
      IdTeam: string | null;
      Score: number | null;
      Players?: FifaPlayer[] | null;
    }
  | null;
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

// FIFA timeline event types we surface. Other types (assists, shots, fouls,
// VAR, period markers, ...) are ignored — assists are folded into their goal.
const FIFA_EVENT_GOAL = 0;
const FIFA_EVENT_ASSIST = 1;
const FIFA_EVENT_YELLOW = 2;
const FIFA_EVENT_RED = 3;
const FIFA_EVENT_SUB = 5;
const FIFA_EVENT_OWN_GOAL = 34;
const EVENT_TYPE: Record<number, string> = {
  [FIFA_EVENT_GOAL]: 'goal',
  [FIFA_EVENT_YELLOW]: 'yellow',
  [FIFA_EVENT_RED]: 'red',
  [FIFA_EVENT_SUB]: 'substitution',
  // An own goal carries the scoring player's own team id; it's shown on that
  // side and counts for the opponent (frontend marks it "(OG)").
  [FIFA_EVENT_OWN_GOAL]: 'own_goal',
};

type FifaEvent = {
  EventId: string;
  IdTeam: string | null;
  IdPlayer: string | null;
  IdSubPlayer: string | null;
  MatchMinute: string | null;
  Period: number | null;
  Type: number;
  HomeGoals: number | null;
  AwayGoals: number | null;
};
type FifaTimeline = { Event: FifaEvent[] | null };

type EventRow = {
  match_id: number;
  fifa_event_id: string;
  type: string;
  team_code: string | null;
  player_name: string | null;
  secondary_name: string | null;
  minute: string | null;
  period: number | null;
  home_goals: number | null;
  away_goals: number | null;
  sort_order: number;
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

// Logs a safeguard-3 correction for the frontend's "result corrected" banner
// (match_corrections, read by fetchRecentMatchCorrections). Best-effort —
// a logging failure shouldn't fail the sync itself.
async function logCorrection(
  supabase: SupabaseClient,
  matchId: number,
  oldHome: number | null,
  oldAway: number | null,
  newHome: number | null,
  newAway: number | null,
  now: Date,
): Promise<void> {
  const { error } = await supabase.from('match_corrections').insert({
    match_id: matchId,
    old_score_home: oldHome,
    old_score_away: oldAway,
    new_score_home: newHome,
    new_score_away: newAway,
    corrected_at: now.toISOString(),
  });
  if (error) {
    console.log(`match ${matchId}: failed to log correction: ${error.message}`);
  }
}

// Resolves a player name from a live-payload roster, preferring the short name.
function playerName(p: FifaPlayer): string {
  const pick = (l: FifaLocalized) => l?.[0]?.Description ?? null;
  return pick(p.ShortName) ?? pick(p.PlayerName) ?? '';
}

// Syncs the goal/card/substitution feed for a live or just-finished match from
// FIFA's timeline endpoint. Player names come from the live payload's rosters
// (the timeline carries only player ids); team ids map to our codes via the
// live payload's Home/AwayTeam ids and the row's codes. Best-effort: any
// failure is logged and swallowed so it never affects the score sync.
async function syncEventsFromFifa(
  supabase: SupabaseClient,
  candidate: Candidate,
  f: FifaLive,
): Promise<void> {
  if (!candidate.fifa_match_id) return;

  // Build id -> name (players) and id -> our code (teams) lookups.
  const names = new Map<string, string>();
  for (const team of [f.HomeTeam, f.AwayTeam]) {
    for (const p of team?.Players ?? []) names.set(p.IdPlayer, playerName(p));
  }
  const teamCode = new Map<string, string | null>();
  if (f.HomeTeam?.IdTeam) teamCode.set(f.HomeTeam.IdTeam, candidate.home_team_code);
  if (f.AwayTeam?.IdTeam) teamCode.set(f.AwayTeam.IdTeam, candidate.away_team_code);

  let timeline: FifaTimeline;
  try {
    const res = await fetch(
      `${FIFA_TIMELINES_URL}/${candidate.fifa_match_id}?language=en`,
      { headers: FIFA_HEADERS },
    );
    if (!res.ok) {
      console.log(`match ${candidate.id}: timeline responded ${res.status}, skipping events`);
      return;
    }
    timeline = (await res.json()) as FifaTimeline;
  } catch (e) {
    console.log(`match ${candidate.id}: timeline fetch failed (${e}), skipping events`);
    return;
  }

  const events = timeline.Event ?? [];
  // Index assists by team+minute so each goal can fold in its assist (FIFA
  // emits the assist as a separate Type 1 event sharing the goal's minute).
  const assists = new Map<string, string>();
  for (const ev of events) {
    if (ev.Type === FIFA_EVENT_ASSIST && ev.IdTeam && ev.IdPlayer) {
      assists.set(`${ev.IdTeam}:${ev.MatchMinute}`, names.get(ev.IdPlayer) ?? '');
    }
  }

  const rows: EventRow[] = [];
  events.forEach((ev, i) => {
    const type = EVENT_TYPE[ev.Type];
    if (!type) return;
    // For subs, IdPlayer is the player coming on and IdSubPlayer the one off.
    const secondary =
      ev.Type === FIFA_EVENT_SUB
        ? (ev.IdSubPlayer ? names.get(ev.IdSubPlayer) ?? null : null)
        : ev.Type === FIFA_EVENT_GOAL
          ? assists.get(`${ev.IdTeam}:${ev.MatchMinute}`) ?? null
          : null;
    rows.push({
      match_id: candidate.id,
      fifa_event_id: ev.EventId,
      type,
      team_code: ev.IdTeam ? teamCode.get(ev.IdTeam) ?? null : null,
      player_name: ev.IdPlayer ? names.get(ev.IdPlayer) ?? null : null,
      secondary_name: secondary,
      minute: ev.MatchMinute,
      period: ev.Period,
      home_goals: ev.HomeGoals,
      away_goals: ev.AwayGoals,
      sort_order: i,
    });
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from('match_events')
      .upsert(rows, { onConflict: 'match_id,fifa_event_id' });
    if (error) {
      console.log(`match ${candidate.id}: match_events upsert failed: ${error.message}`);
      return;
    }
  }
  // Prune events that no longer exist (e.g. a VAR-overturned goal).
  const keep = rows.map((r) => r.fifa_event_id);
  let del = supabase.from('match_events').delete().eq('match_id', candidate.id);
  if (keep.length > 0) del = del.not('fifa_event_id', 'in', `(${keep.join(',')})`);
  const { error: delError } = await del;
  if (delError) {
    console.log(`match ${candidate.id}: match_events prune failed: ${delError.message}`);
  }
}

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

  // Sync the goal/card/sub feed whenever the match is live or finished. Runs
  // regardless of whether the score below changes (a card or sub can land on a
  // tick with no score change). Best-effort — never blocks the score sync.
  if (live || status === 'FINISHED') {
    await syncEventsFromFifa(supabase, candidate, f);
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
  const penaltiesHome = pastRegular ? f.HomeTeamPenaltyScore : null;
  const penaltiesAway = pastRegular ? f.AwayTeamPenaltyScore : null;

  let isCorrection = false;
  let storedHome: number | null = null;
  let storedAway: number | null = null;
  if (!live && status === candidate.status) {
    if (status !== 'FINISHED') {
      console.log(`match ${candidate.id}: FIFA status unchanged (${status}), skipping`);
      return { outcome: 'skipped' };
    }
    // Safeguard 3: already FINISHED — only a candidate because it's inside
    // RECHECK_WINDOW_MS. Skip unless FIFA's score/result actually changed
    // since our last write (e.g. a stoppage-time goal landing a beat behind
    // the FINISHED flag).
    storedHome = pastRegular ? candidate.score_home_et : candidate.score_home_regular;
    storedAway = pastRegular ? candidate.score_away_et : candidate.score_away_regular;
    const unchanged =
      home === storedHome &&
      away === storedAway &&
      winner === candidate.winner &&
      duration === candidate.duration &&
      penaltiesHome === candidate.score_home_penalties &&
      penaltiesAway === candidate.score_away_penalties;
    if (unchanged) {
      console.log(`match ${candidate.id}: FIFA FINISHED recheck unchanged, skipping`);
      return { outcome: 'skipped' };
    }
    isCorrection = true;
    console.log(
      `match ${candidate.id}: FIFA FINISHED recheck found a correction ` +
        `(${storedHome}-${storedAway} -> ${home}-${away}), updating`,
    );
  }

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
        score_home_penalties: penaltiesHome,
        score_away_penalties: penaltiesAway,
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
  if (isCorrection) {
    await logCorrection(supabase, candidate.id, storedHome, storedAway, home, away, now);
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

  const s = m.score;
  // fullTime is the running score while live and the final score (incl.
  // extra time) once done; regularTime holds the 90-minute score when ET
  // was played.
  const regular = s.regularTime ?? s.fullTime;
  const hasEt = s.duration && s.duration !== 'REGULAR';
  const homeRegular = regular?.home ?? null;
  const awayRegular = regular?.away ?? null;
  const homeEt = hasEt ? s.fullTime?.home ?? null : null;
  const awayEt = hasEt ? s.fullTime?.away ?? null : null;
  const penaltiesHome = s.penalties?.home ?? null;
  const penaltiesAway = s.penalties?.away ?? null;
  // football-data has flapped a premature winner on a live match; only trust
  // it once the match is actually over.
  const winner = m.status === 'FINISHED' ? s.winner : null;

  let isCorrection = false;
  if (!live && m.status === candidate.status) {
    if (m.status !== 'FINISHED') {
      console.log(`match ${candidate.id}: football-data status unchanged (${m.status}), skipping`);
      return { updated: false };
    }
    // Safeguard 3: already FINISHED — only a candidate because it's inside
    // RECHECK_WINDOW_MS. Skip unless football-data's score/result changed.
    const unchanged =
      homeRegular === candidate.score_home_regular &&
      awayRegular === candidate.score_away_regular &&
      homeEt === candidate.score_home_et &&
      awayEt === candidate.score_away_et &&
      winner === candidate.winner &&
      s.duration === candidate.duration &&
      penaltiesHome === candidate.score_home_penalties &&
      penaltiesAway === candidate.score_away_penalties;
    if (unchanged) {
      console.log(`match ${candidate.id}: football-data FINISHED recheck unchanged, skipping`);
      return { updated: false };
    }
    isCorrection = true;
    console.log(`match ${candidate.id}: football-data FINISHED recheck found a correction, updating`);
  }

  console.log(
    `match ${candidate.id}: football-data ${candidate.status} -> ${m.status}, minute=${m.minute ?? 'null'}`,
  );

  const { error } = await supabase
    .from('matches')
    .update({
      status: m.status,
      ...pruneNulls({
        score_home_regular: homeRegular,
        score_away_regular: awayRegular,
        score_home_et: homeEt,
        score_away_et: awayEt,
        score_home_penalties: penaltiesHome,
        score_away_penalties: penaltiesAway,
        duration: s.duration,
        winner,
        minute: live ? m.minute : null,
      }),
      ...(m.status === 'FINISHED' ? { minute: null } : {}),
      last_synced_at: now.toISOString(),
    })
    .eq('id', candidate.id);
  if (error) {
    return { updated: false, error: `match ${candidate.id}: ${error.message}` };
  }
  if (isCorrection) {
    const oldHome = candidate.score_home_et ?? candidate.score_home_regular;
    const oldAway = candidate.score_away_et ?? candidate.score_away_regular;
    const newHome = hasEt ? homeEt : homeRegular;
    const newAway = hasEt ? awayEt : awayRegular;
    await logCorrection(supabase, candidate.id, oldHome, oldAway, newHome, newAway, now);
  }
  return { updated: true };
}

// Fetches a match's FIFA live payload (used for the player roster + team ids).
async function fetchFifaLive(fifaMatchId: string): Promise<FifaLive | null> {
  try {
    const res = await fetch(`${FIFA_URL}/${fifaMatchId}?language=en`, {
      headers: FIFA_HEADERS,
    });
    if (!res.ok) return null;
    return (await res.json()) as FifaLive;
  } catch {
    return null;
  }
}

// One-off/idempotent backfill: re-syncs the event feed for every match that has
// a fifa_match_id and has kicked off (status != TIMED), ignoring the live time
// window. Invoke with ?backfill=1. Safe to re-run — syncEventsFromFifa upserts
// and prunes. Processed in small concurrent batches to respect the wall clock.
async function runBackfill(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, fifa_match_id, home_team_code, away_team_code')
    .not('fifa_match_id', 'is', null)
    .neq('status', 'TIMED')
    .order('utc_date', { ascending: true });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const matches = data ?? [];
  let done = 0;
  let noLive = 0;
  const errors: string[] = [];
  const BATCH = 4;
  for (let i = 0; i < matches.length; i += BATCH) {
    await Promise.all(
      matches.slice(i, i + BATCH).map(async (m) => {
        const f = await fetchFifaLive(m.fifa_match_id as string);
        if (!f) {
          noLive++;
          errors.push(`match ${m.id}: no FIFA live payload`);
          return;
        }
        try {
          await syncEventsFromFifa(supabase, m as unknown as Candidate, f);
          done++;
        } catch (e) {
          errors.push(`match ${m.id}: ${e}`);
        }
      }),
    );
  }

  console.log(`backfill: ${done}/${matches.length} matches synced, ${noLive} missing live payload`);
  return Response.json({
    backfilled: done,
    total: matches.length,
    missingLive: noLive,
    errors: errors.length ? errors : undefined,
  });
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (new URL(req.url).searchParams.get('backfill')) {
    return await runBackfill(supabase);
  }

  const now = new Date();
  // Matches that kicked off in the last 6h (2-min lookahead for ones about to
  // start), excluding ones that have been FINISHED for more than
  // RECHECK_WINDOW_MS (safeguard 3 above). Empty set = no API call at all.
  const recheckCutoff = new Date(now.getTime() - RECHECK_WINDOW_MS).toISOString();
  const { data: candidates, error: candidatesError } = await supabase
    .from('matches')
    .select(
      'id, status, utc_date, fifa_match_id, home_team_code, away_team_code, ' +
        'score_home_regular, score_away_regular, ' +
        'score_home_et, score_away_et, score_home_penalties, score_away_penalties, ' +
        'winner, duration, last_synced_at',
    )
    .or(`status.neq.FINISHED,last_synced_at.gte.${recheckCutoff}`)
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
