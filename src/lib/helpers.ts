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

// "Exact" for stat-counting purposes means the score itself was predicted
// correctly — the penalty shootout winner is a separate guess and shouldn't
// affect whether a pick counts as exact. 'half' (4 pts: right score, wrong
// shootout pick) and 'penalty_exact' (5 pts: right score, right shootout
// pick) both qualify; only the per-match point value differs between them.
export function isExactResult(r: PickResult | null): boolean {
  return r === 'exact' || r === 'penalty_exact' || r === 'half';
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
  // ONE_SHOT knockout: the matchup this group predicted for the slot (when it
  // differs from the actual teams, the score reads against these). Null for
  // group/STAGE_BY_STAGE picks where the actual teams were always known.
  predHome: string | null;
  predAway: string | null;
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
    // The penalty winner only matters when the predicted scoreline is a tie —
    // for any non-tie pick it's dead data (and scoring never reads it). Folding
    // it into the key for non-ties would wrongly split identical predictions
    // apart (e.g. a 2-1 with a leftover penalty winner from a since-changed tie
    // pick wouldn't group with everyone else's clean 2-1).
    const isTiePick = p.pickA === p.pickB;
    const penaltiesKeyPart = isTiePick ? (p.pickPenaltiesWinner ?? '') : '';
    // ONE_SHOT knockout: the score is read against the user's predicted matchup,
    // so two "2-1" picks with different predicted teams are different
    // predictions and must not group together.
    const predHome = p.predHome ?? null;
    const predAway = p.predAway ?? null;
    const matchupKeyPart = predHome && predAway ? `${predHome}/${predAway}` : '';
    const key = `${p.pickA}-${p.pickB}-${penaltiesKeyPart}-${matchupKeyPart}`;
    if (!groups[key]) {
      const result = getPickResult(match, p.pickA, p.pickB, p.pickPenaltiesWinner);
      groups[key] = {
        pickA: p.pickA,
        pickB: p.pickB,
        pickPenaltiesWinner: isTiePick ? p.pickPenaltiesWinner : null,
        predHome,
        predAway,
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

// Earliest kickoff (utc_date ISO string) among a stage's matches, or null if
// the stage has no matches / no dates yet.
export function getStageFirstKickoff(matches: Match[], stage: string): string | null {
  const dates = matches
    .filter((m) => m.stage === stage && m.utcDate)
    .map((m) => m.utcDate)
    .sort();
  return dates[0] ?? null;
}

// The deadline (utc_date ISO string) to enter the currently-open knockout
// predictions, or null when there's no open window. Per-mode:
//   ONE_SHOT       - the whole bracket is entered up front, so the single
//                    deadline is the first Round-of-32 kickoff.
//   STAGE_BY_STAGE - each stage is entered before its own first game, so the
//                    deadline is the current stage's first kickoff (only once
//                    that stage's teams are fully resolved).
// Returns the deadline regardless of whether it has already passed — callers
// compare against `now` to decide whether entry is still open.
export function getKnockoutEntryDeadline(
  matches: Match[],
  knockoutMode: string,
): string | null {
  if (!isStageFullyResolved(matches, 'LAST_32')) return null;
  if (knockoutMode === 'ONE_SHOT') {
    return getStageFirstKickoff(matches, 'LAST_32');
  }
  const current = getCurrentKnockoutStage(matches);
  if (!current || current === 'GROUP_STAGE') return null;
  if (!isStageFullyResolved(matches, current)) return null;
  return getStageFirstKickoff(matches, current);
}

// Whether knockout predictions are currently open for entry (the window
// between the bracket resolving and the mode's deadline passing). Mirrors the
// is_prediction_open SQL gate for knockout matches.
export function isKnockoutEntryOpen(
  matches: Match[],
  knockoutMode: string,
  now: number = Date.now(),
): boolean {
  const deadline = getKnockoutEntryDeadline(matches, knockoutMode);
  return deadline !== null && now < Date.parse(deadline);
}

// True when a stage's prediction window has closed — its first game has
// kicked off. Group-stage picks lock at the first group game; knockout picks
// lock per the mode (ONE_SHOT: all knockout stages lock at the first R32 game;
// STAGE_BY_STAGE: each stage locks at its own first game). Drives both the
// read-only gating in PredictionEntryForm and the banner's open/closed state.
export function isPredictionStageLocked(
  matches: Match[],
  stage: string,
  knockoutMode: string,
  now: number = Date.now(),
): boolean {
  const lockAt =
    stage !== 'GROUP_STAGE' && knockoutMode === 'ONE_SHOT'
      ? getStageFirstKickoff(matches, 'LAST_32')
      : getStageFirstKickoff(matches, stage);
  if (!lockAt) return false;
  return now >= Date.parse(lockAt);
}

// Whether the current user may write a prediction for this match. A match is
// writable when either its stage is still open (normal entry) OR the user has
// an active late-submission grace window and the match hasn't kicked off yet.
// Mirrors the grace override in the is_prediction_open SQL gate.
export function isMatchWritable(
  match: Match,
  matches: Match[],
  opts: { knockoutMode: string; graceActive: boolean; now: number },
): boolean {
  if (opts.graceActive && match.utcDate && opts.now < Date.parse(match.utcDate)) {
    return true;
  }
  return !isPredictionStageLocked(matches, match.stage, opts.knockoutMode, opts.now);
}

export function getLiveMinute(match: Match): string | null {
  if (match.status !== 'live' || !match.minute) return null;
  return `${match.minute}'`;
}

// Live data is considered stale when a match is live but sync-live-matches
// hasn't written the row in over 5 min (matching RECHECK_WINDOW_MS in
// sync-live-matches). A stuck sync produces no new data to re-render on, so
// callers should re-evaluate this on a periodic tick (see MatchCard).
export const LIVE_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function isLiveDataStale(match: Match, now: number = Date.now()): boolean {
  if (match.status !== 'live' || !match.lastSyncedAt) return false;
  const synced = Date.parse(match.lastSyncedAt);
  if (Number.isNaN(synced)) return false;
  return now - synced > LIVE_STALE_THRESHOLD_MS;
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
