// sync-knockout-bracket — invoked by pg_cron (every 15 minutes, all day).
// Fills in home_team_code/away_team_code for knockout-stage matches once
// FIFA resolves the placeholder bracket slot to a real team.
//
// FIFA's calendar API (idseason=285023) carries PlaceHolderA/PlaceHolderB for
// every match ("2A" = runner-up Group A, "W73" = winner of match #73) and
// resolves Home/Away to a real team as soon as that slot is mathematically
// decided — observed resolving progressively, before the entire group stage
// finishes (e.g. groups already decided resolve while others are still
// being played). This function just copies that resolution into our schema.
//
// Unlike sync-live-matches, this is a one-way null-fill: once a code is set
// here it permanently drops out of the candidate query below, so there's no
// regression to guard against and no anti-reset safeguards are needed.
//
// Team-code translation: our `teams.code` follows football-data.org
// vocabulary; FIFA's Abbreviation differs only for Uruguay (FIFA: "URU",
// ours: "URY" — confirmed by diffing all 48 FIFA abbreviations against
// `teams.code`, the only mismatch in the whole tournament).
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const FIFA_CALENDAR_URL = 'https://api.fifa.com/api/v3/calendar/matches';
const FIFA_SEASON_ID = '285023';
const FIFA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.fifa.com',
};

const TEAM_CODE_ALIAS: Record<string, string> = {
  URU: 'URY',
};

function ourCode(fifaAbbreviation: string): string {
  return TEAM_CODE_ALIAS[fifaAbbreviation] ?? fifaAbbreviation;
}

type FifaTeam = { Abbreviation: string | null } | null;
type FifaCalendarMatch = {
  IdMatch: string;
  Home: FifaTeam;
  Away: FifaTeam;
};

type Candidate = {
  id: number;
  fifa_match_id: string;
  home_team_code: string | null;
  away_team_code: string | null;
};

Deno.serve(async (req) => {
  const supabase: SupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: candidates, error: candidatesError } = await supabase
    .from('matches')
    .select('id, fifa_match_id, home_team_code, away_team_code')
    .neq('stage', 'GROUP_STAGE')
    .not('fifa_match_id', 'is', null)
    .or('home_team_code.is.null,away_team_code.is.null');

  if (candidatesError) {
    console.log('candidates query error', candidatesError.message);
    return Response.json({ error: candidatesError.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return Response.json({ updated: 0, message: 'no unresolved knockout matches' });
  }
  console.log(`run at ${new Date().toISOString()}: ${candidates.length} candidate(s)`);

  let res: Response;
  try {
    res = await fetch(
      `${FIFA_CALENDAR_URL}?idseason=${FIFA_SEASON_ID}&count=500`,
      { headers: FIFA_HEADERS },
    );
  } catch (e) {
    return Response.json({ error: `FIFA fetch failed: ${e}` }, { status: 502 });
  }
  if (!res.ok) {
    return Response.json(
      { error: `FIFA calendar responded ${res.status}` },
      { status: 502 },
    );
  }

  const payload = (await res.json()) as { Results?: FifaCalendarMatch[] };
  const fifaById = new Map<string, FifaCalendarMatch>(
    (payload.Results ?? []).map((m) => [m.IdMatch, m]),
  );

  const errors: string[] = [];
  let updated = 0;

  for (const candidate of candidates as Candidate[]) {
    const fifaMatch = fifaById.get(candidate.fifa_match_id);
    if (!fifaMatch) {
      console.log(`match ${candidate.id}: fifa_match_id ${candidate.fifa_match_id} not found in calendar`);
      continue;
    }

    const homeAbbr = fifaMatch.Home?.Abbreviation ?? null;
    const awayAbbr = fifaMatch.Away?.Abbreviation ?? null;

    const update: Record<string, string> = {};
    if (candidate.home_team_code === null && homeAbbr) {
      update.home_team_code = ourCode(homeAbbr);
    }
    if (candidate.away_team_code === null && awayAbbr) {
      update.away_team_code = ourCode(awayAbbr);
    }

    if (Object.keys(update).length === 0) continue;

    console.log(`match ${candidate.id}: resolving`, update);
    const { error } = await supabase
      .from('matches')
      .update(update)
      .eq('id', candidate.id);
    if (error) {
      errors.push(`match ${candidate.id}: ${error.message}`);
      continue;
    }
    updated++;
  }

  return Response.json(
    { updated, candidates: candidates.length, errors: errors.length ? errors : undefined },
    { status: errors.length ? 500 : 200 },
  );
});
