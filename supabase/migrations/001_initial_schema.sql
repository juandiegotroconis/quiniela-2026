-- FWC26 Quiniela — Initial Schema
-- Run in your Supabase project SQL editor

-- Teams
CREATE TABLE teams (
  code      text PRIMARY KEY,
  name      text NOT NULL,
  color     text NOT NULL,
  group_id  text NOT NULL  -- 'A' through 'L'
);

-- Matches (IDs match football-data.org API season 2026)
CREATE TABLE matches (
  id          integer PRIMARY KEY,  -- football-data.org match ID
  group_id    text NOT NULL,
  matchday    integer NOT NULL,
  team_a      text REFERENCES teams(code),
  team_b      text REFERENCES teams(code),
  score_a     integer,
  score_b     integer,
  status      text DEFAULT 'upcoming',  -- 'upcoming' | 'live' | 'finished'
  match_time  text,
  match_date  text,
  played_at   timestamptz
);

-- Quinielas (friend leagues)
CREATE TABLE quinielas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  is_active   boolean DEFAULT true
);

-- Quiniela members
CREATE TABLE quiniela_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_color text DEFAULT '#02B906',
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(quiniela_id, user_id)
);

-- Prediction submissions (one row = submitted & locked)
CREATE TABLE prediction_submissions (
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY(quiniela_id, user_id)
);

-- Match predictions (locked on submission)
CREATE TABLE predictions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id     integer REFERENCES matches(id),
  pick_a       integer NOT NULL CHECK (pick_a >= 0),
  pick_b       integer NOT NULL CHECK (pick_b >= 0),
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(quiniela_id, user_id, match_id)
);

-- Top scorer predictions (locked on submission)
CREATE TABLE top_scorer_predictions (
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name  text NOT NULL,
  player_team  text REFERENCES teams(code),
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY(quiniela_id, user_id)
);

-- Leaderboard history snapshots (for sparklines)
CREATE TABLE leaderboard_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rank         integer NOT NULL,
  points       integer NOT NULL DEFAULT 0,
  snapshot_at  timestamptz DEFAULT now()
);

-- ── Seed: 48 teams (A–L) ──

INSERT INTO teams (code, name, color, group_id) VALUES
  -- Group A
  ('MEX', 'Mexico',              '#006847', 'A'),
  ('RSA', 'South Africa',        '#007A4D', 'A'),
  ('KOR', 'South Korea',         '#C60C30', 'A'),
  ('CZE', 'Czechia',             '#D7141A', 'A'),
  -- Group B
  ('CAN', 'Canada',              '#FF0000', 'B'),
  ('BIH', 'Bosnia-Herzegovina',  '#002B7F', 'B'),
  ('QAT', 'Qatar',               '#8D1B3D', 'B'),
  ('SUI', 'Switzerland',         '#E8112D', 'B'),
  -- Group C
  ('BRA', 'Brazil',              '#009C3B', 'C'),
  ('MAR', 'Morocco',             '#C1272D', 'C'),
  ('HAI', 'Haiti',               '#00209F', 'C'),
  ('SCO', 'Scotland',            '#003399', 'C'),
  -- Group D
  ('USA', 'United States',       '#2A398D', 'D'),
  ('PAR', 'Paraguay',            '#D52B1E', 'D'),
  ('AUS', 'Australia',           '#00843D', 'D'),
  ('TUR', 'Turkey',              '#E30A17', 'D'),
  -- Group E
  ('GER', 'Germany',             '#1A1A22', 'E'),
  ('CUW', 'Curaçao',             '#003DA5', 'E'),
  ('CIV', 'Ivory Coast',         '#F77F00', 'E'),
  ('ECU', 'Ecuador',             '#FFD100', 'E'),
  -- Group F
  ('NED', 'Netherlands',         '#FF6600', 'F'),
  ('JPN', 'Japan',               '#BC002D', 'F'),
  ('SWE', 'Sweden',              '#006AA7', 'F'),
  ('TUN', 'Tunisia',             '#E70013', 'F'),
  -- Group G
  ('BEL', 'Belgium',             '#EF3340', 'G'),
  ('EGY', 'Egypt',               '#CE1126', 'G'),
  ('IRN', 'Iran',                '#239F40', 'G'),
  ('NZL', 'New Zealand',         '#00247D', 'G'),
  -- Group H
  ('ESP', 'Spain',               '#AA151B', 'H'),
  ('CPV', 'Cape Verde Islands',  '#003893', 'H'),
  ('KSA', 'Saudi Arabia',        '#006C35', 'H'),
  ('URY', 'Uruguay',             '#5EB6E4', 'H'),
  -- Group I
  ('FRA', 'France',              '#002395', 'I'),
  ('SEN', 'Senegal',             '#00853F', 'I'),
  ('IRQ', 'Iraq',                '#BB0000', 'I'),
  ('NOR', 'Norway',              '#EF2B2D', 'I'),
  -- Group J
  ('ARG', 'Argentina',           '#74ACDF', 'J'),
  ('ALG', 'Algeria',             '#006233', 'J'),
  ('AUT', 'Austria',             '#ED2939', 'J'),
  ('JOR', 'Jordan',              '#007A3D', 'J'),
  -- Group K
  ('POR', 'Portugal',            '#006600', 'K'),
  ('COD', 'Congo DR',            '#007FFF', 'K'),
  ('UZB', 'Uzbekistan',          '#1EB53A', 'K'),
  ('COL', 'Colombia',            '#FCD116', 'K'),
  -- Group L
  ('ENG', 'England',             '#CF081F', 'L'),
  ('CRO', 'Croatia',             '#CC3333', 'L'),
  ('GHA', 'Ghana',               '#006B3F', 'L'),
  ('PAN', 'Panama',              '#DB0020', 'L');

-- ── Seed: 72 group-stage matches ──

INSERT INTO matches (id, group_id, matchday, team_a, team_b, score_a, score_b, status, match_time, match_date) VALUES
  -- Matchday 1
  (537327, 'A', 1, 'MEX', 'RSA', 2,    1,    'finished', 'FT',   'Jun 11'),
  (537328, 'A', 1, 'KOR', 'CZE', 0,    0,    'finished', 'FT',   'Jun 11'),
  (537333, 'B', 1, 'CAN', 'BIH', 2,    0,    'finished', 'FT',   'Jun 12'),
  (537345, 'D', 1, 'USA', 'PAR', 1,    0,    'finished', 'FT',   'Jun 12'),
  (537334, 'B', 1, 'QAT', 'SUI', 0,    3,    'finished', 'FT',   'Jun 13'),
  (537339, 'C', 1, 'BRA', 'MAR', 2,    1,    'finished', 'FT',   'Jun 13'),
  (537340, 'C', 1, 'HAI', 'SCO', 0,    0,    'live',     '74''', 'Jun 13'),
  (537346, 'D', 1, 'AUS', 'TUR', NULL, NULL, 'upcoming', '00:00','Jun 14'),
  (537351, 'E', 1, 'GER', 'CUW', NULL, NULL, 'upcoming', '13:00','Jun 14'),
  (537357, 'F', 1, 'NED', 'JPN', NULL, NULL, 'upcoming', '16:00','Jun 14'),
  (537352, 'E', 1, 'CIV', 'ECU', NULL, NULL, 'upcoming', '19:00','Jun 14'),
  (537358, 'F', 1, 'SWE', 'TUN', NULL, NULL, 'upcoming', '22:00','Jun 14'),
  (537369, 'H', 1, 'ESP', 'CPV', NULL, NULL, 'upcoming', '12:00','Jun 15'),
  (537363, 'G', 1, 'BEL', 'EGY', NULL, NULL, 'upcoming', '15:00','Jun 15'),
  (537370, 'H', 1, 'KSA', 'URY', NULL, NULL, 'upcoming', '18:00','Jun 15'),
  (537364, 'G', 1, 'IRN', 'NZL', NULL, NULL, 'upcoming', '21:00','Jun 15'),
  (537391, 'I', 1, 'FRA', 'SEN', NULL, NULL, 'upcoming', '15:00','Jun 16'),
  (537392, 'I', 1, 'IRQ', 'NOR', NULL, NULL, 'upcoming', '18:00','Jun 16'),
  (537397, 'J', 1, 'ARG', 'ALG', NULL, NULL, 'upcoming', '21:00','Jun 16'),
  (537398, 'J', 1, 'AUT', 'JOR', NULL, NULL, 'upcoming', '00:00','Jun 17'),
  (537403, 'K', 1, 'POR', 'COD', NULL, NULL, 'upcoming', '13:00','Jun 17'),
  (537409, 'L', 1, 'ENG', 'CRO', NULL, NULL, 'upcoming', '16:00','Jun 17'),
  (537410, 'L', 1, 'GHA', 'PAN', NULL, NULL, 'upcoming', '19:00','Jun 17'),
  (537404, 'K', 1, 'UZB', 'COL', NULL, NULL, 'upcoming', '22:00','Jun 17'),
  -- Matchday 2
  (537329, 'A', 2, 'CZE', 'RSA', NULL, NULL, 'upcoming', '12:00','Jun 18'),
  (537335, 'B', 2, 'SUI', 'BIH', NULL, NULL, 'upcoming', '15:00','Jun 18'),
  (537336, 'B', 2, 'CAN', 'QAT', NULL, NULL, 'upcoming', '18:00','Jun 18'),
  (537330, 'A', 2, 'MEX', 'KOR', NULL, NULL, 'upcoming', '21:00','Jun 18'),
  (537348, 'D', 2, 'USA', 'AUS', NULL, NULL, 'upcoming', '15:00','Jun 19'),
  (537342, 'C', 2, 'SCO', 'MAR', NULL, NULL, 'upcoming', '18:00','Jun 19'),
  (537341, 'C', 2, 'BRA', 'HAI', NULL, NULL, 'upcoming', '20:30','Jun 19'),
  (537347, 'D', 2, 'TUR', 'PAR', NULL, NULL, 'upcoming', '23:00','Jun 19'),
  (537359, 'F', 2, 'NED', 'SWE', NULL, NULL, 'upcoming', '13:00','Jun 20'),
  (537353, 'E', 2, 'GER', 'CIV', NULL, NULL, 'upcoming', '16:00','Jun 20'),
  (537354, 'E', 2, 'ECU', 'CUW', NULL, NULL, 'upcoming', '20:00','Jun 20'),
  (537360, 'F', 2, 'TUN', 'JPN', NULL, NULL, 'upcoming', '00:00','Jun 21'),
  (537371, 'H', 2, 'ESP', 'KSA', NULL, NULL, 'upcoming', '12:00','Jun 21'),
  (537365, 'G', 2, 'BEL', 'IRN', NULL, NULL, 'upcoming', '15:00','Jun 21'),
  (537372, 'H', 2, 'URY', 'CPV', NULL, NULL, 'upcoming', '18:00','Jun 21'),
  (537366, 'G', 2, 'NZL', 'EGY', NULL, NULL, 'upcoming', '21:00','Jun 21'),
  (537399, 'J', 2, 'ARG', 'AUT', NULL, NULL, 'upcoming', '13:00','Jun 22'),
  (537393, 'I', 2, 'FRA', 'IRQ', NULL, NULL, 'upcoming', '17:00','Jun 22'),
  (537394, 'I', 2, 'NOR', 'SEN', NULL, NULL, 'upcoming', '20:00','Jun 22'),
  (537400, 'J', 2, 'JOR', 'ALG', NULL, NULL, 'upcoming', '23:00','Jun 22'),
  (537405, 'K', 2, 'POR', 'UZB', NULL, NULL, 'upcoming', '13:00','Jun 23'),
  (537411, 'L', 2, 'ENG', 'GHA', NULL, NULL, 'upcoming', '16:00','Jun 23'),
  (537412, 'L', 2, 'PAN', 'CRO', NULL, NULL, 'upcoming', '19:00','Jun 23'),
  (537406, 'K', 2, 'COL', 'COD', NULL, NULL, 'upcoming', '22:00','Jun 23'),
  -- Matchday 3
  (537337, 'B', 3, 'SUI', 'CAN', NULL, NULL, 'upcoming', '15:00','Jun 24'),
  (537338, 'B', 3, 'BIH', 'QAT', NULL, NULL, 'upcoming', '15:00','Jun 24'),
  (537344, 'C', 3, 'MAR', 'HAI', NULL, NULL, 'upcoming', '18:00','Jun 24'),
  (537343, 'C', 3, 'SCO', 'BRA', NULL, NULL, 'upcoming', '18:00','Jun 24'),
  (537331, 'A', 3, 'CZE', 'MEX', NULL, NULL, 'upcoming', '21:00','Jun 24'),
  (537332, 'A', 3, 'RSA', 'KOR', NULL, NULL, 'upcoming', '21:00','Jun 24'),
  (537355, 'E', 3, 'ECU', 'GER', NULL, NULL, 'upcoming', '16:00','Jun 25'),
  (537356, 'E', 3, 'CUW', 'CIV', NULL, NULL, 'upcoming', '16:00','Jun 25'),
  (537361, 'F', 3, 'TUN', 'NED', NULL, NULL, 'upcoming', '19:00','Jun 25'),
  (537362, 'F', 3, 'JPN', 'SWE', NULL, NULL, 'upcoming', '19:00','Jun 25'),
  (537349, 'D', 3, 'TUR', 'USA', NULL, NULL, 'upcoming', '22:00','Jun 25'),
  (537350, 'D', 3, 'PAR', 'AUS', NULL, NULL, 'upcoming', '22:00','Jun 25'),
  (537395, 'I', 3, 'NOR', 'FRA', NULL, NULL, 'upcoming', '15:00','Jun 26'),
  (537396, 'I', 3, 'SEN', 'IRQ', NULL, NULL, 'upcoming', '15:00','Jun 26'),
  (537373, 'H', 3, 'URY', 'ESP', NULL, NULL, 'upcoming', '20:00','Jun 26'),
  (537374, 'H', 3, 'CPV', 'KSA', NULL, NULL, 'upcoming', '20:00','Jun 26'),
  (537367, 'G', 3, 'NZL', 'BEL', NULL, NULL, 'upcoming', '23:00','Jun 26'),
  (537368, 'G', 3, 'EGY', 'IRN', NULL, NULL, 'upcoming', '23:00','Jun 26'),
  (537413, 'L', 3, 'PAN', 'ENG', NULL, NULL, 'upcoming', '17:00','Jun 27'),
  (537414, 'L', 3, 'CRO', 'GHA', NULL, NULL, 'upcoming', '17:00','Jun 27'),
  (537407, 'K', 3, 'COL', 'POR', NULL, NULL, 'upcoming', '19:30','Jun 27'),
  (537408, 'K', 3, 'COD', 'UZB', NULL, NULL, 'upcoming', '19:30','Jun 27'),
  (537401, 'J', 3, 'JOR', 'ARG', NULL, NULL, 'upcoming', '22:00','Jun 27'),
  (537402, 'J', 3, 'ALG', 'AUT', NULL, NULL, 'upcoming', '22:00','Jun 27');

-- ── Row Level Security ──

ALTER TABLE quinielas ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_scorer_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Members can read their quiniela's data
CREATE POLICY "members read quiniela" ON quinielas
  FOR SELECT USING (
    id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members read members" ON quiniela_members
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

CREATE POLICY "users read own predictions" ON predictions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "members read all predictions after lock" ON predictions
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

CREATE POLICY "users insert own predictions" ON predictions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND quiniela_id NOT IN (
      SELECT quiniela_id FROM prediction_submissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users manage own submission" ON prediction_submissions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users manage own top scorer" ON top_scorer_predictions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "members read leaderboard" ON leaderboard_snapshots
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );
