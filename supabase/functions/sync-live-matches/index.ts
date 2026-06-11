// sync-live-matches — invoked by pg_cron (every 2 min, 16:00–06:58 UTC).
// Updates live/just-finished matches from football-data.org. The
// trg_match_finished trigger on `matches` handles the leaderboard refresh
// when a match transitions to FINISHED, so this function only writes rows.
import { createClient } from 'npm:@supabase/supabase-js@2';

const FD_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const DAY_MS = 24 * 60 * 60 * 1000;

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

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

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
    .select('id, status')
    .neq('status', 'FINISHED')
    .lte('utc_date', new Date(now.getTime() + 2 * 60 * 1000).toISOString())
    .gte('utc_date', new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString());

  if (candidatesError) {
    return Response.json({ error: candidatesError.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return Response.json({ updated: 0, message: 'no ongoing matches' });
  }

  // One request covers every candidate: dateFrom/dateTo only accept yyyy-MM-dd,
  // so bracket today with ±1 day to be safe across UTC midnight.
  const params = new URLSearchParams({
    season: '2026',
    dateFrom: dateOnly(new Date(now.getTime() - DAY_MS)),
    dateTo: dateOnly(new Date(now.getTime() + DAY_MS)),
  });
  const res = await fetch(`${FD_URL}?${params}`, {
    headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_DATA_KEY')! },
  });
  if (!res.ok) {
    return Response.json(
      { error: `football-data.org responded ${res.status}` },
      { status: 502 },
    );
  }
  const payload = await res.json();
  const apiMatches = new Map<number, FdMatch>(
    ((payload.matches ?? []) as FdMatch[]).map((m) => [m.id, m]),
  );

  const errors: string[] = [];
  let updated = 0;
  await Promise.all(
    candidates.map(async (candidate) => {
      const m = apiMatches.get(candidate.id);
      if (!m) return;
      // Skip writes while nothing is happening (e.g. delayed kickoff still TIMED).
      const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
      if (!live && m.status === candidate.status) return;

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
          score_home_regular: regular?.home ?? null,
          score_away_regular: regular?.away ?? null,
          score_home_et: hasEt ? s.fullTime?.home ?? null : null,
          score_away_et: hasEt ? s.fullTime?.away ?? null : null,
          score_home_penalties: s.penalties?.home ?? null,
          score_away_penalties: s.penalties?.away ?? null,
          duration: s.duration ?? null,
          winner: s.winner ?? null,
          minute: m.minute ?? null,
          last_synced_at: now.toISOString(),
        })
        .eq('id', candidate.id);
      if (error) {
        errors.push(`match ${candidate.id}: ${error.message}`);
      } else {
        updated++;
      }
    }),
  );

  return Response.json(
    { updated, candidates: candidates.length, errors: errors.length ? errors : undefined },
    { status: errors.length ? 500 : 200 },
  );
});
