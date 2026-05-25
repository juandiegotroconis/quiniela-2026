// Groups A–L: real FIFA World Cup 2026 draw (48 teams, 12 groups)
export const GROUPS: Record<string, string[]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URY'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

export const TEAM_FULL: Record<string, string> = {
  // Group A
  MEX: 'Mexico', RSA: 'South Africa', KOR: 'South Korea', CZE: 'Czechia',
  // Group B
  CAN: 'Canada', BIH: 'Bosnia-Herzegovina', QAT: 'Qatar', SUI: 'Switzerland',
  // Group C
  BRA: 'Brazil', MAR: 'Morocco', HAI: 'Haiti', SCO: 'Scotland',
  // Group D
  USA: 'United States', PAR: 'Paraguay', AUS: 'Australia', TUR: 'Turkey',
  // Group E
  GER: 'Germany', CUW: 'Curaçao', CIV: 'Ivory Coast', ECU: 'Ecuador',
  // Group F
  NED: 'Netherlands', JPN: 'Japan', SWE: 'Sweden', TUN: 'Tunisia',
  // Group G
  BEL: 'Belgium', EGY: 'Egypt', IRN: 'Iran', NZL: 'New Zealand',
  // Group H
  ESP: 'Spain', CPV: 'Cape Verde Islands', KSA: 'Saudi Arabia', URY: 'Uruguay',
  // Group I
  FRA: 'France', SEN: 'Senegal', IRQ: 'Iraq', NOR: 'Norway',
  // Group J
  ARG: 'Argentina', ALG: 'Algeria', AUT: 'Austria', JOR: 'Jordan',
  // Group K
  POR: 'Portugal', COD: 'Congo DR', UZB: 'Uzbekistan', COL: 'Colombia',
  // Group L
  ENG: 'England', CRO: 'Croatia', GHA: 'Ghana', PAN: 'Panama',
};

export const TEAM_COLORS: Record<string, string> = {
  // Group A
  MEX: '#006847', RSA: '#007A4D', KOR: '#C60C30', CZE: '#D7141A',
  // Group B
  CAN: '#FF0000', BIH: '#002B7F', QAT: '#8D1B3D', SUI: '#E8112D',
  // Group C
  BRA: '#009C3B', MAR: '#C1272D', HAI: '#00209F', SCO: '#003399',
  // Group D
  USA: '#2A398D', PAR: '#D52B1E', AUS: '#00843D', TUR: '#E30A17',
  // Group E
  GER: '#1A1A22', CUW: '#003DA5', CIV: '#F77F00', ECU: '#FFD100',
  // Group F
  NED: '#FF6600', JPN: '#BC002D', SWE: '#006AA7', TUN: '#E70013',
  // Group G
  BEL: '#EF3340', EGY: '#CE1126', IRN: '#239F40', NZL: '#00247D',
  // Group H
  ESP: '#AA151B', CPV: '#003893', KSA: '#006C35', URY: '#5EB6E4',
  // Group I
  FRA: '#002395', SEN: '#00853F', IRQ: '#BB0000', NOR: '#EF2B2D',
  // Group J
  ARG: '#74ACDF', ALG: '#006233', AUT: '#ED2939', JOR: '#007A3D',
  // Group K
  POR: '#006600', COD: '#007FFF', UZB: '#1EB53A', COL: '#FCD116',
  // Group L
  ENG: '#CF081F', CRO: '#CC3333', GHA: '#006B3F', PAN: '#DB0020',
};

export const AVATAR_COLORS: string[] = [
  '#E84C30', '#2979FF', '#7B2D8E', '#02B906', '#C8A94E',
  '#FF6D00', '#C2185B', '#00BFA5', '#1A237E', '#00B0FF',
  '#3CAC3B', '#FF1744', '#E61D25', '#FFDB00', '#004D40',
];

export const ME_ID = 5;

export interface Player {
  id: number;
  name: string;
  pts: number;
  rank: number;
  prevRank: number;
  history: number[];
}

export const PLAYERS: Player[] = [
  // pts/ranks derived from PREDICTIONS data against 6 finished matches
  { id: 1,  name: 'Juan Rodríguez',   pts: 35, rank: 2,  prevRank: 2,  history: [10,15,25,25,30,35] },
  { id: 2,  name: 'Sarah Mitchell',   pts: 30, rank: 6,  prevRank: 5,  history: [5,5,10,20,25,30] },
  { id: 3,  name: 'Ahmed Khan',       pts: 45, rank: 1,  prevRank: 1,  history: [5,10,15,25,35,45] },
  { id: 4,  name: 'Yuki Tanaka',      pts: 35, rank: 3,  prevRank: 3,  history: [5,15,25,25,30,35] },
  { id: 5,  name: 'You',              pts: 35, rank: 4,  prevRank: 6,  history: [5,5,10,20,25,35] },
  { id: 6,  name: "Liam O'Brien",     pts: 35, rank: 5,  prevRank: 4,  history: [5,15,20,25,30,35] },
  { id: 7,  name: 'Priya Sharma',     pts: 25, rank: 7,  prevRank: 7,  history: [10,20,20,25,25,25] },
  { id: 8,  name: 'Carlos Ruiz',      pts: 15, rank: 9,  prevRank: 12, history: [0,0,0,5,5,15] },
  { id: 9,  name: 'Emma Chen',        pts: 5,  rank: 13, prevRank: 13, history: [5,5,5,5,5,5] },
  { id: 10, name: 'Diego Morales',    pts: 5,  rank: 14, prevRank: 14, history: [0,0,0,5,5,5] },
  { id: 11, name: 'Fatima Al-Hassan', pts: 20, rank: 8,  prevRank: 8,  history: [0,0,0,10,20,20] },
  { id: 12, name: 'Lucas Silva',      pts: 5,  rank: 15, prevRank: 15, history: [0,0,0,5,5,5] },
  { id: 13, name: 'Maria González',   pts: 15, rank: 10, prevRank: 9,  history: [5,5,5,15,15,15] },
  { id: 14, name: 'Tomás Andersson',  pts: 10, rank: 12, prevRank: 11, history: [0,0,0,10,10,10] },
  { id: 15, name: 'Aisha Okafor',     pts: 15, rank: 11, prevRank: 10, history: [5,5,5,15,15,15] },
];

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

// All 72 group-stage matches — IDs match football-data.org API (season 2026)
// Times shown in US Eastern Time (UTC−4)
// Simulated: 537327–537339 finished/live for demo purposes
export const MATCHES: Match[] = [
  // ── Matchday 1 ──
  { id: 537327, group: 'A', day: 1, teamA: 'MEX', teamB: 'RSA', scoreA: 2,    scoreB: 1,    status: 'finished', time: 'FT',   date: 'Jun 11' },
  { id: 537328, group: 'A', day: 1, teamA: 'KOR', teamB: 'CZE', scoreA: 0,    scoreB: 0,    status: 'finished', time: 'FT',   date: 'Jun 11' },
  { id: 537333, group: 'B', day: 1, teamA: 'CAN', teamB: 'BIH', scoreA: 2,    scoreB: 0,    status: 'finished', time: 'FT',   date: 'Jun 12' },
  { id: 537345, group: 'D', day: 1, teamA: 'USA', teamB: 'PAR', scoreA: 1,    scoreB: 0,    status: 'finished', time: 'FT',   date: 'Jun 12' },
  { id: 537334, group: 'B', day: 1, teamA: 'QAT', teamB: 'SUI', scoreA: 0,    scoreB: 3,    status: 'finished', time: 'FT',   date: 'Jun 13' },
  { id: 537339, group: 'C', day: 1, teamA: 'BRA', teamB: 'MAR', scoreA: 2,    scoreB: 1,    status: 'finished', time: 'FT',   date: 'Jun 13' },
  { id: 537340, group: 'C', day: 1, teamA: 'HAI', teamB: 'SCO', scoreA: 0,    scoreB: 0,    status: 'live',     time: "74'",  date: 'Jun 13' },
  { id: 537346, group: 'D', day: 1, teamA: 'AUS', teamB: 'TUR', scoreA: null, scoreB: null, status: 'upcoming', time: '00:00', date: 'Jun 14' },
  { id: 537351, group: 'E', day: 1, teamA: 'GER', teamB: 'CUW', scoreA: null, scoreB: null, status: 'upcoming', time: '13:00', date: 'Jun 14' },
  { id: 537357, group: 'F', day: 1, teamA: 'NED', teamB: 'JPN', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 14' },
  { id: 537352, group: 'E', day: 1, teamA: 'CIV', teamB: 'ECU', scoreA: null, scoreB: null, status: 'upcoming', time: '19:00', date: 'Jun 14' },
  { id: 537358, group: 'F', day: 1, teamA: 'SWE', teamB: 'TUN', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 14' },
  { id: 537369, group: 'H', day: 1, teamA: 'ESP', teamB: 'CPV', scoreA: null, scoreB: null, status: 'upcoming', time: '12:00', date: 'Jun 15' },
  { id: 537363, group: 'G', day: 1, teamA: 'BEL', teamB: 'EGY', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 15' },
  { id: 537370, group: 'H', day: 1, teamA: 'KSA', teamB: 'URY', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 15' },
  { id: 537364, group: 'G', day: 1, teamA: 'IRN', teamB: 'NZL', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 15' },
  { id: 537391, group: 'I', day: 1, teamA: 'FRA', teamB: 'SEN', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 16' },
  { id: 537392, group: 'I', day: 1, teamA: 'IRQ', teamB: 'NOR', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 16' },
  { id: 537397, group: 'J', day: 1, teamA: 'ARG', teamB: 'ALG', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 16' },
  { id: 537398, group: 'J', day: 1, teamA: 'AUT', teamB: 'JOR', scoreA: null, scoreB: null, status: 'upcoming', time: '00:00', date: 'Jun 17' },
  { id: 537403, group: 'K', day: 1, teamA: 'POR', teamB: 'COD', scoreA: null, scoreB: null, status: 'upcoming', time: '13:00', date: 'Jun 17' },
  { id: 537409, group: 'L', day: 1, teamA: 'ENG', teamB: 'CRO', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 17' },
  { id: 537410, group: 'L', day: 1, teamA: 'GHA', teamB: 'PAN', scoreA: null, scoreB: null, status: 'upcoming', time: '19:00', date: 'Jun 17' },
  { id: 537404, group: 'K', day: 1, teamA: 'UZB', teamB: 'COL', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 17' },
  // ── Matchday 2 ──
  { id: 537329, group: 'A', day: 2, teamA: 'CZE', teamB: 'RSA', scoreA: null, scoreB: null, status: 'upcoming', time: '12:00', date: 'Jun 18' },
  { id: 537335, group: 'B', day: 2, teamA: 'SUI', teamB: 'BIH', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 18' },
  { id: 537336, group: 'B', day: 2, teamA: 'CAN', teamB: 'QAT', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 18' },
  { id: 537330, group: 'A', day: 2, teamA: 'MEX', teamB: 'KOR', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 18' },
  { id: 537348, group: 'D', day: 2, teamA: 'USA', teamB: 'AUS', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 19' },
  { id: 537342, group: 'C', day: 2, teamA: 'SCO', teamB: 'MAR', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 19' },
  { id: 537341, group: 'C', day: 2, teamA: 'BRA', teamB: 'HAI', scoreA: null, scoreB: null, status: 'upcoming', time: '20:30', date: 'Jun 19' },
  { id: 537347, group: 'D', day: 2, teamA: 'TUR', teamB: 'PAR', scoreA: null, scoreB: null, status: 'upcoming', time: '23:00', date: 'Jun 19' },
  { id: 537359, group: 'F', day: 2, teamA: 'NED', teamB: 'SWE', scoreA: null, scoreB: null, status: 'upcoming', time: '13:00', date: 'Jun 20' },
  { id: 537353, group: 'E', day: 2, teamA: 'GER', teamB: 'CIV', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 20' },
  { id: 537354, group: 'E', day: 2, teamA: 'ECU', teamB: 'CUW', scoreA: null, scoreB: null, status: 'upcoming', time: '20:00', date: 'Jun 20' },
  { id: 537360, group: 'F', day: 2, teamA: 'TUN', teamB: 'JPN', scoreA: null, scoreB: null, status: 'upcoming', time: '00:00', date: 'Jun 21' },
  { id: 537371, group: 'H', day: 2, teamA: 'ESP', teamB: 'KSA', scoreA: null, scoreB: null, status: 'upcoming', time: '12:00', date: 'Jun 21' },
  { id: 537365, group: 'G', day: 2, teamA: 'BEL', teamB: 'IRN', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 21' },
  { id: 537372, group: 'H', day: 2, teamA: 'URY', teamB: 'CPV', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 21' },
  { id: 537366, group: 'G', day: 2, teamA: 'NZL', teamB: 'EGY', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 21' },
  { id: 537399, group: 'J', day: 2, teamA: 'ARG', teamB: 'AUT', scoreA: null, scoreB: null, status: 'upcoming', time: '13:00', date: 'Jun 22' },
  { id: 537393, group: 'I', day: 2, teamA: 'FRA', teamB: 'IRQ', scoreA: null, scoreB: null, status: 'upcoming', time: '17:00', date: 'Jun 22' },
  { id: 537394, group: 'I', day: 2, teamA: 'NOR', teamB: 'SEN', scoreA: null, scoreB: null, status: 'upcoming', time: '20:00', date: 'Jun 22' },
  { id: 537400, group: 'J', day: 2, teamA: 'JOR', teamB: 'ALG', scoreA: null, scoreB: null, status: 'upcoming', time: '23:00', date: 'Jun 22' },
  { id: 537405, group: 'K', day: 2, teamA: 'POR', teamB: 'UZB', scoreA: null, scoreB: null, status: 'upcoming', time: '13:00', date: 'Jun 23' },
  { id: 537411, group: 'L', day: 2, teamA: 'ENG', teamB: 'GHA', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 23' },
  { id: 537412, group: 'L', day: 2, teamA: 'PAN', teamB: 'CRO', scoreA: null, scoreB: null, status: 'upcoming', time: '19:00', date: 'Jun 23' },
  { id: 537406, group: 'K', day: 2, teamA: 'COL', teamB: 'COD', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 23' },
  // ── Matchday 3 ──
  { id: 537337, group: 'B', day: 3, teamA: 'SUI', teamB: 'CAN', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 24' },
  { id: 537338, group: 'B', day: 3, teamA: 'BIH', teamB: 'QAT', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 24' },
  { id: 537344, group: 'C', day: 3, teamA: 'MAR', teamB: 'HAI', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 24' },
  { id: 537343, group: 'C', day: 3, teamA: 'SCO', teamB: 'BRA', scoreA: null, scoreB: null, status: 'upcoming', time: '18:00', date: 'Jun 24' },
  { id: 537331, group: 'A', day: 3, teamA: 'CZE', teamB: 'MEX', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 24' },
  { id: 537332, group: 'A', day: 3, teamA: 'RSA', teamB: 'KOR', scoreA: null, scoreB: null, status: 'upcoming', time: '21:00', date: 'Jun 24' },
  { id: 537355, group: 'E', day: 3, teamA: 'ECU', teamB: 'GER', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 25' },
  { id: 537356, group: 'E', day: 3, teamA: 'CUW', teamB: 'CIV', scoreA: null, scoreB: null, status: 'upcoming', time: '16:00', date: 'Jun 25' },
  { id: 537361, group: 'F', day: 3, teamA: 'TUN', teamB: 'NED', scoreA: null, scoreB: null, status: 'upcoming', time: '19:00', date: 'Jun 25' },
  { id: 537362, group: 'F', day: 3, teamA: 'JPN', teamB: 'SWE', scoreA: null, scoreB: null, status: 'upcoming', time: '19:00', date: 'Jun 25' },
  { id: 537349, group: 'D', day: 3, teamA: 'TUR', teamB: 'USA', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 25' },
  { id: 537350, group: 'D', day: 3, teamA: 'PAR', teamB: 'AUS', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 25' },
  { id: 537395, group: 'I', day: 3, teamA: 'NOR', teamB: 'FRA', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 26' },
  { id: 537396, group: 'I', day: 3, teamA: 'SEN', teamB: 'IRQ', scoreA: null, scoreB: null, status: 'upcoming', time: '15:00', date: 'Jun 26' },
  { id: 537373, group: 'H', day: 3, teamA: 'URY', teamB: 'ESP', scoreA: null, scoreB: null, status: 'upcoming', time: '20:00', date: 'Jun 26' },
  { id: 537374, group: 'H', day: 3, teamA: 'CPV', teamB: 'KSA', scoreA: null, scoreB: null, status: 'upcoming', time: '20:00', date: 'Jun 26' },
  { id: 537367, group: 'G', day: 3, teamA: 'NZL', teamB: 'BEL', scoreA: null, scoreB: null, status: 'upcoming', time: '23:00', date: 'Jun 26' },
  { id: 537368, group: 'G', day: 3, teamA: 'EGY', teamB: 'IRN', scoreA: null, scoreB: null, status: 'upcoming', time: '23:00', date: 'Jun 26' },
  { id: 537413, group: 'L', day: 3, teamA: 'PAN', teamB: 'ENG', scoreA: null, scoreB: null, status: 'upcoming', time: '17:00', date: 'Jun 27' },
  { id: 537414, group: 'L', day: 3, teamA: 'CRO', teamB: 'GHA', scoreA: null, scoreB: null, status: 'upcoming', time: '17:00', date: 'Jun 27' },
  { id: 537407, group: 'K', day: 3, teamA: 'COL', teamB: 'POR', scoreA: null, scoreB: null, status: 'upcoming', time: '19:30', date: 'Jun 27' },
  { id: 537408, group: 'K', day: 3, teamA: 'COD', teamB: 'UZB', scoreA: null, scoreB: null, status: 'upcoming', time: '19:30', date: 'Jun 27' },
  { id: 537401, group: 'J', day: 3, teamA: 'JOR', teamB: 'ARG', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 27' },
  { id: 537402, group: 'J', day: 3, teamA: 'ALG', teamB: 'AUT', scoreA: null, scoreB: null, status: 'upcoming', time: '22:00', date: 'Jun 27' },
];

export interface Prediction {
  playerId: number;
  pickA: number;
  pickB: number;
}

// Demo predictions for the 6 finished + 1 live group-stage matches
export const PREDICTIONS: Record<number, Prediction[]> = {
  537327: [ // MEX 2–1 RSA
    { playerId: 1, pickA: 2, pickB: 1 }, { playerId: 7, pickA: 2, pickB: 1 },
    { playerId: 5, pickA: 1, pickB: 0 }, { playerId: 3, pickA: 1, pickB: 0 }, { playerId: 6, pickA: 1, pickB: 0 },
    { playerId: 2, pickA: 2, pickB: 0 }, { playerId: 4, pickA: 2, pickB: 0 }, { playerId: 9, pickA: 2, pickB: 0 },
    { playerId: 8, pickA: 0, pickB: 1 }, { playerId: 10, pickA: 0, pickB: 1 },
    { playerId: 11, pickA: 1, pickB: 1 }, { playerId: 12, pickA: 1, pickB: 1 }, { playerId: 14, pickA: 1, pickB: 1 },
    { playerId: 15, pickA: 3, pickB: 1 }, { playerId: 13, pickA: 3, pickB: 1 },
  ],
  537328: [ // KOR 0–0 CZE
    { playerId: 1, pickA: 1, pickB: 1 }, { playerId: 3, pickA: 1, pickB: 1 },
    { playerId: 2, pickA: 2, pickB: 0 }, { playerId: 5, pickA: 2, pickB: 0 }, { playerId: 8, pickA: 2, pickB: 0 },
    { playerId: 4, pickA: 0, pickB: 0 }, { playerId: 6, pickA: 0, pickB: 0 }, { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 2 }, { playerId: 10, pickA: 1, pickB: 2 }, { playerId: 12, pickA: 1, pickB: 2 },
    { playerId: 11, pickA: 0, pickB: 1 }, { playerId: 14, pickA: 0, pickB: 1 }, { playerId: 15, pickA: 0, pickB: 1 },
    { playerId: 13, pickA: 2, pickB: 1 },
  ],
  537333: [ // CAN 2–0 BIH
    { playerId: 4, pickA: 2, pickB: 0 }, { playerId: 1, pickA: 2, pickB: 0 },
    { playerId: 2, pickA: 1, pickB: 0 }, { playerId: 3, pickA: 1, pickB: 0 },
    { playerId: 5, pickA: 2, pickB: 1 }, { playerId: 6, pickA: 2, pickB: 1 },
    { playerId: 8, pickA: 0, pickB: 0 }, { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 1 }, { playerId: 10, pickA: 1, pickB: 1 }, { playerId: 11, pickA: 1, pickB: 1 }, { playerId: 13, pickA: 1, pickB: 1 },
    { playerId: 12, pickA: 0, pickB: 1 }, { playerId: 14, pickA: 0, pickB: 1 }, { playerId: 15, pickA: 0, pickB: 1 },
  ],
  537345: [ // USA 1–0 PAR
    { playerId: 1, pickA: 2, pickB: 2 },
    { playerId: 3, pickA: 1, pickB: 0 }, { playerId: 2, pickA: 1, pickB: 0 }, { playerId: 5, pickA: 1, pickB: 0 },
    { playerId: 4, pickA: 0, pickB: 0 }, { playerId: 9, pickA: 0, pickB: 0 },
    { playerId: 6, pickA: 2, pickB: 1 }, { playerId: 8, pickA: 2, pickB: 1 }, { playerId: 10, pickA: 2, pickB: 1 },
    { playerId: 7, pickA: 3, pickB: 1 }, { playerId: 12, pickA: 3, pickB: 1 },
    { playerId: 11, pickA: 1, pickB: 0 }, { playerId: 13, pickA: 1, pickB: 0 }, { playerId: 14, pickA: 1, pickB: 0 }, { playerId: 15, pickA: 1, pickB: 0 },
  ],
  537334: [ // QAT 0–3 SUI
    { playerId: 11, pickA: 0, pickB: 3 }, { playerId: 3, pickA: 0, pickB: 3 },
    { playerId: 1, pickA: 0, pickB: 2 }, { playerId: 5, pickA: 0, pickB: 2 }, { playerId: 6, pickA: 0, pickB: 2 },
    { playerId: 2, pickA: 0, pickB: 1 }, { playerId: 4, pickA: 0, pickB: 1 },
    { playerId: 8, pickA: 0, pickB: 0 }, { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 1 }, { playerId: 10, pickA: 1, pickB: 1 },
    { playerId: 12, pickA: 1, pickB: 0 }, { playerId: 13, pickA: 1, pickB: 0 }, { playerId: 14, pickA: 1, pickB: 0 }, { playerId: 15, pickA: 1, pickB: 0 },
  ],
  537339: [ // BRA 2–1 MAR
    { playerId: 1, pickA: 2, pickB: 0 }, { playerId: 2, pickA: 2, pickB: 0 },
    { playerId: 3, pickA: 2, pickB: 1 }, { playerId: 5, pickA: 2, pickB: 1 }, { playerId: 8, pickA: 2, pickB: 1 },
    { playerId: 4, pickA: 3, pickB: 0 }, { playerId: 6, pickA: 3, pickB: 0 },
    { playerId: 7, pickA: 1, pickB: 1 }, { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 0, pickB: 1 }, { playerId: 11, pickA: 0, pickB: 1 },
    { playerId: 12, pickA: 1, pickB: 2 }, { playerId: 13, pickA: 1, pickB: 2 },
    { playerId: 14, pickA: 0, pickB: 0 }, { playerId: 15, pickA: 0, pickB: 0 },
  ],
  537340: [ // HAI 0–0 SCO (live 74')
    { playerId: 1, pickA: 0, pickB: 2 }, { playerId: 2, pickA: 0, pickB: 2 }, { playerId: 3, pickA: 0, pickB: 2 },
    { playerId: 4, pickA: 0, pickB: 1 }, { playerId: 5, pickA: 0, pickB: 1 },
    { playerId: 6, pickA: 0, pickB: 0 }, { playerId: 8, pickA: 0, pickB: 0 },
    { playerId: 7, pickA: 1, pickB: 1 }, { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 1, pickB: 0 }, { playerId: 11, pickA: 1, pickB: 0 },
    { playerId: 12, pickA: 2, pickB: 1 }, { playerId: 14, pickA: 2, pickB: 1 },
    { playerId: 13, pickA: 1, pickB: 2 }, { playerId: 15, pickA: 1, pickB: 2 },
  ],
};

export interface TopScorerSuggestion {
  name: string;
  team: string;
}

export const TOP_SCORER_SUGGESTIONS: TopScorerSuggestion[] = [
  { name: 'Kylian Mbappé',        team: 'FRA' },
  { name: 'Lionel Messi',         team: 'ARG' },
  { name: 'Erling Haaland',       team: 'NOR' },
  { name: 'Vinícius Jr',          team: 'BRA' },
  { name: 'Harry Kane',           team: 'ENG' },
  { name: 'Lautaro Martínez',     team: 'ARG' },
  { name: 'Cristiano Ronaldo',    team: 'POR' },
  { name: 'Jamal Musiala',        team: 'GER' },
  { name: 'Bukayo Saka',          team: 'ENG' },
  { name: 'Cody Gakpo',           team: 'NED' },
  { name: 'Son Heung-min',        team: 'KOR' },
  { name: 'Santiago Giménez',     team: 'MEX' },
  { name: 'Sadio Mané',           team: 'SEN' },
  { name: 'Achraf Hakimi',        team: 'MAR' },
  { name: 'Lamine Yamal',         team: 'ESP' },
  { name: 'Pedri',                team: 'ESP' },
  { name: 'Federico Valverde',    team: 'URY' },
  { name: 'Christian Pulisic',    team: 'USA' },
];
