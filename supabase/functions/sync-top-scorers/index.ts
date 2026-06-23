// sync-top-scorers — invoked by pg_cron (every 5 min, 16:00–06:58 UTC).
// Refreshes the `top_scorers` Golden Boot board from FIFA's gameday API
// (the `gcp_top_scorer` story), which is the only source for it — the
// unauthenticated api.fifa.com/api/v3 statistics routes are deprecated/empty.
//
// A single request returns the entire top-50 ranking: one "story" whose
// `actors[]` array holds 50 players, each tagged with rank (`number`), goals,
// assists, minutes, team abbreviation, image, and FIFA person id. The wildcard
// `:page:(.*)` form of the query is rejected (403/429) — only the anchored
// `:page:1` form works, and it already contains the whole board.
//
// ── Auth ─────────────────────────────────────────────────────────────────
// Gameday requires an anonymous Bearer token (403 without it) that expires
// every ~24h. It's minted by a plain unauthenticated GET to FIFA's own
// TOKEN_URL (no cookie/key, just browser-like headers) which returns
// {"token":"eyJ..."} — exactly what fifa.com's stats widget does on load. We
// mint a fresh one each run, so there's nothing to refresh by hand. (Found via
// a HAR capture of the stats page; the mint flow lives in a lazy JS chunk.)
//
// ── Gating ──────────────────────────────────────────────────────────────
// The board only changes when goals are scored, so we skip the FIFA call
// entirely unless a match is live or finished within the last 35 min.
import { createClient } from 'npm:@supabase/supabase-js@2';

const COMPETITION_ID = '285023'; // FIFA gameday competitionId (= v3 IdSeason)
const GAMEDAY_BASE = 'https://gameday-prod.fifa.mangodev.co.uk/1-0/stories';
const TOKEN_URL = 'https://cxm-api.fifa.com/fifaplusweb/api/external/gameDay/token';
// Just over the 30-min cron interval, so a match that finishes right after one
// tick is still a candidate on the next tick (its final goals get captured).
const RECENT_FINISH_MS = 35 * 60 * 1000;

const FIFA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.fifa.com',
};

// FIFA team abbreviation → app team code (mostly identical; only Uruguay
// differs, mirroring migration 11's URY↔URU alias).
const TEAM_ALIAS: Record<string, string> = { URU: 'URY' };

type GamedayActor = {
  number: number;
  name: Record<string, string>;
  key: { _externalSportsPersonId?: string };
  tags: { name: string; value: unknown }[];
};

function tagValue(actor: GamedayActor, suffix: string): unknown {
  return actor.tags.find((t) => t.name.endsWith(suffix))?.value ?? null;
}

function toInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}

function buildUrl(): string {
  // `query` and `sort` carry literal back-ticks, `==`, `(.*)`, `$` — encode the
  // whole values so the proxy receives them verbatim.
  const query =
    '(and resourceStatus==`urn:gd:resourceStatus:active` ' +
    '_externalId~`urn:gd:story:classification:gcp_top_scorer:' +
    `competitionId:${COMPETITION_ID}:goals:rank_asc:page:1$\`)`;
  const params = new URLSearchParams({
    query,
    skip: '0',
    limit: '1',
    sort: 'tags.name==urn:gd:tag:story:fifa:column_number:asc',
  });
  return `${GAMEDAY_BASE}?${params}`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Gate: only call FIFA if a match is live or just finished.
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - RECENT_FINISH_MS).toISOString();
  const { data: active, error: activeError } = await supabase
    .from('matches')
    .select('id, status, last_synced_at')
    .or(
      `status.in.(IN_PLAY,PAUSED),and(status.eq.FINISHED,last_synced_at.gte.${recentCutoff})`,
    )
    .limit(1);
  if (activeError) {
    console.log('active-match query error', activeError.message);
    return Response.json({ error: activeError.message }, { status: 500 });
  }
  if (!active || active.length === 0) {
    return Response.json({ updated: 0, message: 'no live or recent matches' });
  }

  // Mint a fresh anonymous gameday token (unauthenticated; valid ~22h).
  let token: string;
  try {
    const tokenRes = await fetch(TOKEN_URL, { headers: FIFA_HEADERS });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.log(`token mint failed ${tokenRes.status}`, body.slice(0, 200));
      return Response.json(
        { error: `token mint failed ${tokenRes.status}` },
        { status: 502 },
      );
    }
    token = (await tokenRes.json())?.token;
    if (!token) {
      console.log('token mint returned no token field');
      return Response.json({ error: 'no token in mint response' }, { status: 502 });
    }
  } catch (e) {
    console.log('token mint threw', String(e));
    return Response.json({ error: 'token mint error' }, { status: 502 });
  }

  const res = await fetch(buildUrl(), {
    headers: { ...FIFA_HEADERS, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    const body = await res.text();
    console.log(`gameday auth failed (${res.status})`, body.slice(0, 200));
    return Response.json(
      { error: 'gameday auth failed', status: res.status },
      { status: 502 },
    );
  }
  if (!res.ok) {
    const body = await res.text();
    console.log(`gameday responded ${res.status}`, body.slice(0, 200));
    return Response.json({ error: `gameday responded ${res.status}` }, { status: 502 });
  }

  const payload = await res.json();
  const actors: GamedayActor[] = payload?.items?.[0]?.actors ?? [];
  if (actors.length === 0) {
    console.log('gameday returned no actors', JSON.stringify(payload).slice(0, 200));
    return Response.json({ updated: 0, message: 'no scorers in response' });
  }

  const rows = actors
    .filter((a) => a.key?._externalSportsPersonId)
    .map((a) => {
      const fifaTeam = String(tagValue(a, 'team:abbreviation') ?? '');
      return {
        fifa_person_id: a.key._externalSportsPersonId!,
        rank: a.number,
        name: a.name?.eng ?? a.name?.spa ?? 'Unknown',
        name_es: a.name?.spa ?? a.name?.eng ?? null,
        team_code: TEAM_ALIAS[fifaTeam] ?? fifaTeam,
        goals: toInt(tagValue(a, 'stats:goals')) ?? 0,
        assists: toInt(tagValue(a, 'stats:assists')) ?? 0,
        minutes_played: toInt(tagValue(a, 'total_competition_minutes_played')),
        image_url: (tagValue(a, 'staff:image') as string | null) ?? null,
        updated_at: now.toISOString(),
      };
    });

  const { error: upsertError } = await supabase
    .from('top_scorers')
    .upsert(rows, { onConflict: 'fifa_person_id' });
  if (upsertError) {
    console.log('upsert error', upsertError.message);
    return Response.json({ error: upsertError.message }, { status: 500 });
  }

  // Drop anyone who fell off the board so old ranks don't linger.
  const keep = rows.map((r) => r.fifa_person_id);
  const { error: deleteError } = await supabase
    .from('top_scorers')
    .delete()
    .not('fifa_person_id', 'in', `(${keep.join(',')})`);
  if (deleteError) console.log('prune error', deleteError.message);

  console.log(`top_scorers refreshed: ${rows.length} player(s)`);
  return Response.json({ updated: rows.length });
});
