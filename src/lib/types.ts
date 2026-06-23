export type MatchStatus = 'finished' | 'live' | 'upcoming';

export interface Match {
  id: number;
  group: string;
  day: number;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  utcDate: string;
  stage: string;
  scoreAEt: number | null;
  scoreBEt: number | null;
  winner: string | null;
  minute: string | null;
  // True at half-time (DB status PAUSED): match is live but on a break, so the
  // UI shows "Half time" instead of the lingering last in-play minute.
  isHalftime: boolean;
  venue: string | null;
  venueCity: string | null;
  venueCountry: string | null;
}

export interface Member {
  userId: string;
  displayName: string;
  avatarColor: string;
  pts: number;
  rank: number;
  prevRank: number | null;
  rankChange: number | null;
  exactCount: number;
  correctCount: number;
  scoredMatches: number;
  bestStreak: number;
  worstStreak: number;
  currentStreak: number;
  history: number[];
  joinedAt: string | null;
}

export interface MatchPrediction {
  userId: string;
  displayName: string;
  avatarColor: string;
  pickA: number;
  pickB: number;
  pickPenaltiesWinner: string | null;
}

export interface TopScorer {
  fifaPersonId: string;
  rank: number;
  name: string;
  nameEs: string | null;
  teamCode: string;
  goals: number;
  assists: number;
  minutesPlayed: number | null;
  imageUrl: string | null;
}

export interface TopScorerPick {
  userId: string;
  playerName: string;
  playerTeam: string;
}

export interface MatchCorrection {
  id: number;
  matchId: number;
  teamA: string;
  teamB: string;
  oldScoreA: number | null;
  oldScoreB: number | null;
  newScoreA: number | null;
  newScoreB: number | null;
  correctedAt: string;
}
