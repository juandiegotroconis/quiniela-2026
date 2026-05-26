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
  time: string;
  date: string;
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
  history: number[];
}

export interface MatchPrediction {
  userId: string;
  displayName: string;
  avatarColor: string;
  pickA: number;
  pickB: number;
}
