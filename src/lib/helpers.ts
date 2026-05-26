import { GROUPS, TEAM_COLORS } from './mock-data';
import type { Match, MatchPrediction } from './types';

export type PickResult = 'exact' | 'winner' | 'miss';

export function getPickResult(match: Match, pickA: number, pickB: number): PickResult | null {
  if (match.status !== 'finished') return null;
  if (pickA === match.scoreA && pickB === match.scoreB) return 'exact';
  const pickSign = Math.sign(pickA - pickB);
  const realSign = Math.sign((match.scoreA ?? 0) - (match.scoreB ?? 0));
  if (pickSign === realSign) return 'winner';
  return 'miss';
}

export function getResultPoints(r: PickResult | null): number {
  if (r === 'exact') return 5;
  if (r === 'winner') return 3;
  return 0;
}

export function getResultLabel(r: PickResult | null): string {
  if (r === 'exact') return 'Exact';
  if (r === 'winner') return 'Winner';
  return 'Miss';
}

export function getResultVariant(r: PickResult | null): 'success' | 'warning' | 'default' {
  if (r === 'exact') return 'success';
  if (r === 'winner') return 'warning';
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
  key: string;
  result: PickResult | null;
  points: number;
  label: string | null;
  variant: 'success' | 'warning' | 'default' | null;
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
    const key = `${p.pickA}-${p.pickB}`;
    if (!groups[key]) {
      const result = getPickResult(match, p.pickA, p.pickB);
      groups[key] = {
        pickA: p.pickA,
        pickB: p.pickB,
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

  const order: Record<string, number> = { exact: 0, winner: 1, miss: 2 };
  return Object.values(groups).sort((a, b) => {
    const oa = a.result ? order[a.result] : 3;
    const ob = b.result ? order[b.result] : 3;
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
