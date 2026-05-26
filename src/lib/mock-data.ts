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
