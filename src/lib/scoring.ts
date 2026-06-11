export type MainResult = 'exact' | 'penalty_exact' | 'half' | 'tendency' | 'miss';

export interface PredictionInput {
  pickHome: number;
  pickAway: number;
  pickPenaltiesWinner?: string | null;
}

export interface MatchResultInput {
  stage: string;
  scoreHomeRegular: number | null;
  scoreAwayRegular: number | null;
  scoreHomeEt: number | null;
  scoreAwayEt: number | null;
  winner: string | null;
  homeTeamCode: string;
  awayTeamCode: string;
}

const MAIN_RESULT_POINTS: Record<MainResult, number> = {
  exact: 5,
  penalty_exact: 5,
  half: 4,
  tendency: 3,
  miss: 0,
};

export function getMainResultPoints(r: MainResult | null): number {
  return r ? MAIN_RESULT_POINTS[r] : 0;
}

export function getMainResult(match: MatchResultInput, pred: PredictionInput): MainResult | null {
  const { pickHome, pickAway } = pred;

  if (match.stage === 'GROUP_STAGE') {
    if (match.scoreHomeRegular === null || match.scoreAwayRegular === null) return null;
    if (pickHome === match.scoreHomeRegular && pickAway === match.scoreAwayRegular) return 'exact';
    const pickSign = Math.sign(pickHome - pickAway);
    const realSign = Math.sign(match.scoreHomeRegular - match.scoreAwayRegular);
    return pickSign === realSign ? 'tendency' : 'miss';
  }

  // Knockout: final score is the ET score if the match went to extra time, else the regular score.
  const finalHome = match.scoreHomeEt ?? match.scoreHomeRegular;
  const finalAway = match.scoreAwayEt ?? match.scoreAwayRegular;
  if (finalHome === null || finalAway === null) return null;

  const isDraw = finalHome === finalAway;
  if (!isDraw) {
    if (pickHome === finalHome && pickAway === finalAway) return 'exact';
    const pickSign = Math.sign(pickHome - pickAway);
    const realSign = Math.sign(finalHome - finalAway);
    return pickSign === realSign ? 'tendency' : 'miss';
  }

  // Draw after ET — decided on penalties.
  if (pickHome === finalHome && pickAway === finalAway) {
    return pred.pickPenaltiesWinner === match.winner ? 'penalty_exact' : 'half';
  }
  if (pickHome === pickAway) return 'tendency';
  return 'miss';
}

export function calculateBracketBonus(
  predTeamA: string,
  predTeamB: string,
  actualHome: string,
  actualAway: string,
): number {
  const predicted = new Set([predTeamA, predTeamB]);
  const actual = new Set([actualHome, actualAway]);
  let matches = 0;
  for (const team of predicted) if (actual.has(team)) matches++;
  return matches >= 2 ? 2 : matches === 1 ? 1 : 0;
}
