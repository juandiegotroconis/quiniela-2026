import { GROUPS, TEAM_COLORS } from './mock-data';
import { getMainResult, getMainResultPoints } from './scoring';
import type { MainResult } from './scoring';
import type { Match, MatchPrediction } from './types';
import type { TranslationKey } from './translation-context';

export type PickResult = MainResult;

export function getPickResult(
  match: Match,
  pickA: number,
  pickB: number,
  pickPenaltiesWinner: string | null = null,
): PickResult | null {
  if (match.status !== 'finished' && match.status !== 'live') return null;
  return getMainResult(
    {
      stage: match.stage,
      scoreHomeRegular: match.scoreA,
      scoreAwayRegular: match.scoreB,
      scoreHomeEt: match.scoreAEt,
      scoreAwayEt: match.scoreBEt,
      winner: match.winner,
      homeTeamCode: match.teamA,
      awayTeamCode: match.teamB,
    },
    { pickHome: pickA, pickAway: pickB, pickPenaltiesWinner },
  );
}

export function getResultPoints(r: PickResult | null): number {
  return getMainResultPoints(r);
}

export function getResultLabel(r: PickResult | null): string {
  if (r === 'exact' || r === 'penalty_exact') return 'Exact';
  if (r === 'half') return 'Half';
  if (r === 'tendency') return 'Winner';
  return 'Miss';
}

export function getResultVariant(r: PickResult | null): 'success' | 'warning' | 'info' | 'default' {
  if (r === 'exact' || r === 'penalty_exact') return 'success';
  if (r === 'half') return 'info';
  if (r === 'tendency') return 'warning';
  return 'default';
}

export interface PredictionGroupPlayer {
  userId: string;
  displayName: string;
  avatarColor: string;
  isMe: boolean;
}

export interface PredictionGroup {
  pickA: number;
  pickB: number;
  pickPenaltiesWinner: string | null;
  key: string;
  result: PickResult | null;
  points: number;
  label: string | null;
  variant: 'success' | 'warning' | 'info' | 'default' | null;
  players: PredictionGroupPlayer[];
  hasMe: boolean;
}

export function groupPredictions(
  preds: MatchPrediction[],
  match: Match,
  myUserId: string | null,
): PredictionGroup[] {
  const groups: Record<string, PredictionGroup> = {};

  for (const p of preds) {
    const key = `${p.pickA}-${p.pickB}-${p.pickPenaltiesWinner ?? ''}`;
    if (!groups[key]) {
      const result = getPickResult(match, p.pickA, p.pickB, p.pickPenaltiesWinner);
      groups[key] = {
        pickA: p.pickA,
        pickB: p.pickB,
        pickPenaltiesWinner: p.pickPenaltiesWinner,
        key,
        result,
        points: getResultPoints(result),
        label: result ? getResultLabel(result) : null,
        variant: result ? getResultVariant(result) : null,
        players: [],
        hasMe: false,
      };
    }
    const isMe = p.userId === myUserId;
    groups[key].players.push({ userId: p.userId, displayName: p.displayName, avatarColor: p.avatarColor, isMe });
    if (isMe) groups[key].hasMe = true;
  }

  const order: Record<MainResult, number> = { exact: 0, penalty_exact: 0, half: 1, tendency: 2, miss: 3 };
  return Object.values(groups).sort((a, b) => {
    const oa = a.result ? order[a.result] : 4;
    const ob = b.result ? order[b.result] : 4;
    return oa !== ob ? oa - ob : b.players.length - a.players.length;
  });
}

export interface TeamStanding {
  team: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  projected: boolean;
}

export interface UserPick {
  pickA: string | number;
  pickB: string | number;
}

export function calcGroupStandings(
  groupId: string,
  matches: Match[],
  userPicks: Record<number, UserPick> | null,
): TeamStanding[] {
  const teams = GROUPS[groupId] ?? [];
  const gm = matches.filter(m => m.group === groupId);
  const s: Record<string, TeamStanding> = {};
  teams.forEach(t => {
    s[t] = { team: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, projected: false };
  });

  gm.forEach(match => {
    let sA: number, sB: number, proj = false;
    if (match.status === 'finished' || match.status === 'live') {
      sA = match.scoreA ?? 0;
      sB = match.scoreB ?? 0;
    } else if (
      userPicks &&
      userPicks[match.id] &&
      userPicks[match.id].pickA !== '' &&
      userPicks[match.id].pickB !== ''
    ) {
      sA = parseInt(String(userPicks[match.id].pickA));
      sB = parseInt(String(userPicks[match.id].pickB));
      if (isNaN(sA) || isNaN(sB)) return;
      proj = true;
    } else {
      return;
    }

    s[match.teamA].mp++;
    s[match.teamB].mp++;
    s[match.teamA].gf += sA;
    s[match.teamA].ga += sB;
    s[match.teamB].gf += sB;
    s[match.teamB].ga += sA;
    if (proj) { s[match.teamA].projected = true; s[match.teamB].projected = true; }
    if (sA > sB) {
      s[match.teamA].w++; s[match.teamA].pts += 3; s[match.teamB].l++;
    } else if (sA < sB) {
      s[match.teamB].w++; s[match.teamB].pts += 3; s[match.teamA].l++;
    } else {
      s[match.teamA].d++; s[match.teamA].pts += 1;
      s[match.teamB].d++; s[match.teamB].pts += 1;
    }
    s[match.teamA].gd = s[match.teamA].gf - s[match.teamA].ga;
    s[match.teamB].gd = s[match.teamB].gf - s[match.teamB].ga;
  });

  return Object.values(s).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export function getTeamColor(code: string): string {
  return TEAM_COLORS[code] ?? '#24242E';
}

const STAGE_LABEL_KEYS: Record<string, TranslationKey> = {
  LAST_32: 'STAGE_LAST_32',
  LAST_16: 'STAGE_LAST_16',
  QUARTER_FINALS: 'STAGE_QUARTER_FINALS',
  SEMI_FINALS: 'STAGE_SEMI_FINALS',
  THIRD_PLACE: 'STAGE_THIRD_PLACE',
  FINAL: 'STAGE_FINAL',
};

// Tournament order of knockout stages, used to build stage navigation.
export const KNOCKOUT_STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];

// Translation key for a knockout-stage label, or null for group-stage matches (shown as "Group X" instead).
export function getStageLabelKey(stage: string): TranslationKey | null {
  return STAGE_LABEL_KEYS[stage] ?? null;
}

// Teams still alive in the tournament: the union of LAST_32 entrants (the
// 32 qualifiers, populated once the bracket-resolution sync fills in those
// matches' team codes) minus the loser of every FINISHED knockout match.
// Used to populate the "guess the matchup" pickers for not-yet-determined
// knockout slots.
export function getAliveTeams(matches: Match[]): string[] {
  const alive = new Set<string>();
  for (const m of matches) {
    if (m.stage !== 'LAST_32') continue;
    if (m.teamA) alive.add(m.teamA);
    if (m.teamB) alive.add(m.teamB);
  }
  for (const m of matches) {
    if (m.stage === 'GROUP_STAGE' || m.status !== 'finished') continue;
    if (m.winner === 'HOME_TEAM' && m.teamB) alive.delete(m.teamB);
    if (m.winner === 'AWAY_TEAM' && m.teamA) alive.delete(m.teamA);
  }
  return Array.from(alive).sort();
}

// Whether every match in a knockout stage has both teams resolved — the gate
// for showing that stage's predictions at all (no row-by-row trickle as the
// bracket-resolution sync fills individual matches in).
export function isStageFullyResolved(matches: Match[], stage: string): boolean {
  const stageMatches = matches.filter((m) => m.stage === stage);
  return stageMatches.length > 0 && stageMatches.every((m) => m.teamA && m.teamB);
}

// STAGE_BY_STAGE mode: the one knockout stage currently open for
// predictions — the earliest stage (tournament order) that isn't fully
// FINISHED yet. Returns null once the tournament (or the bracket beyond
// what's been resolved) is complete.
export function getCurrentKnockoutStage(matches: Match[]): string | null {
  for (const stage of KNOCKOUT_STAGE_ORDER) {
    const stageMatches = matches.filter((m) => m.stage === stage);
    if (stageMatches.length === 0) continue;
    if (stageMatches.some((m) => m.status !== 'finished')) return stage;
  }
  return null;
}

export function getLiveMinute(match: Match): string | null {
  if (match.status !== 'live' || !match.minute) return null;
  return `${match.minute}'`;
}

const DATE_LOCALES: Record<string, string> = { en: 'en-US', es: 'es-VE' };

// es locales emit lowercase weekday/month names ("jue, 11 jun")
function capitalizeWords(s: string): string {
  return s.replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function formatMatchDate(utcDate: string, language: string): string {
  if (!utcDate) return '';
  const formatted = new Date(utcDate).toLocaleDateString(DATE_LOCALES[language] ?? language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return capitalizeWords(formatted);
}

export function formatMatchTime(utcDate: string, language: string): string {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleTimeString(DATE_LOCALES[language] ?? language, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMatchDateTime(utcDate: string, language: string): string {
  if (!utcDate) return '';
  return `${formatMatchDate(utcDate, language)} · ${formatMatchTime(utcDate, language)}`;
}
