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
  // Last time sync-live-matches wrote this row (ISO). Used to flag stale live
  // data when the sync stalls — see isLiveDataStale in helpers.ts.
  lastSyncedAt: string | null;
  // Knockout bracket feeder graph (target-side): which earlier match's outcome
  // fills this match's home/away slot, and whether the winner or loser advances.
  // Null for group-stage and Round-of-32 matches (fed from group standings).
  // Lets PredictionEntryForm cascade a user's winner picks into later rounds.
  homeSourceMatchId: number | null;
  awaySourceMatchId: number | null;
  homeSourceOutcome: 'winner' | 'loser' | null;
  awaySourceOutcome: 'winner' | 'loser' | null;
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
  // ONE_SHOT knockout only: the matchup the user predicted for this slot (from
  // bracket_predictions). The score pickA/pickB apply to *these* predicted
  // teams, which can differ from the actual teams that resolved into the slot.
  // Absent for group matches and STAGE_BY_STAGE, where the teams are always
  // known at entry time.
  predHome?: string | null;
  predAway?: string | null;
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

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'yellow'
  | 'red'
  | 'substitution';

export interface MatchEvent {
  id: number;
  matchId: number;
  type: MatchEventType;
  teamCode: string | null;
  // Scorer / booked player / player coming on (sub).
  playerName: string | null;
  // Assist (goal) or player going off (sub).
  secondaryName: string | null;
  minute: string | null;
  period: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  sortOrder: number;
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
