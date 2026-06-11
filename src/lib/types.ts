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
