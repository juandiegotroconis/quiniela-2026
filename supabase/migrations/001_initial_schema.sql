-- ─────────────────────────────────────────────────────────────────────────────
-- FWC26 Quiniela — Initial Schema
--
-- Sources of truth:
--   Match / team data  → football-data.org API (integer IDs)
--   Auth               → Supabase auth.users (uuid)
--
-- Scoring rules:
--   Exact 90-min score         → 5 pts
--   Correct 90-min result      → 3 pts
--   Correct penalties winner   → +2 pts bonus (KO stage only)
--
-- Leaderboard strategy:
--   leaderboard_cache is a plain table refreshed once per match finish
--   via trigger → no computation on reads, safe for N concurrent users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tables ───────────────────────────────────────────────────────────────────

-- Reference data for the 48 World Cup teams.
-- fd_id is the football-data.org integer team ID, populated on first API sync.
-- iso2 is the flag CDN code (ISO 3166-1 alpha-2, or subdivision tag for SCO/ENG).
CREATE TABLE teams (
  code     text    PRIMARY KEY,       -- 3-letter FIFA TLA (MEX, BRA, …)
  fd_id    integer UNIQUE,            -- football-data.org integer ID (synced)
  iso2     text    NOT NULL,          -- flag CDN code: 'mx', 'br', 'gb-sct', …
  name     text    NOT NULL,
  color    text    NOT NULL,
  group_id text    NOT NULL           -- 'A'–'L' for group-stage seeding
);

-- football-data.org is the source of truth; this table is kept in sync via
-- an Edge Function. utc_date is the authoritative kickoff time.
--
-- Score fields mirror the API's score object:
--   score_{home|away}_regular   → goals at 90 min (basis for quiniela scoring)
--   score_{home|away}_et        → goals in extra time only (NULL if not played)
--   score_{home|away}_penalties → penalty shootout score (NULL if not played)
--   duration                    → REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
--   winner                      → HOME_TEAM | AWAY_TEAM | DRAW
--
-- display_date / display_time are pre-formatted strings for the UI (EDT).
CREATE TABLE matches (
  id                   integer PRIMARY KEY,   -- football-data.org match ID
  stage                text    NOT NULL DEFAULT 'GROUP_STAGE',
  -- stage values: GROUP_STAGE | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
  group_name           text,                  -- 'A'–'L'; NULL for knockout rounds
  matchday             integer,
  home_team_code       text REFERENCES teams(code),
  away_team_code       text REFERENCES teams(code),
  utc_date             timestamptz NOT NULL,
  status               text NOT NULL DEFAULT 'TIMED',
  -- status values: SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED
  score_home_regular   integer,
  score_away_regular   integer,
  score_home_et        integer,
  score_away_et        integer,
  score_home_penalties integer,
  score_away_penalties integer,
  duration             text,
  winner               text,
  display_date         text,
  display_time         text,
  last_synced_at       timestamptz DEFAULT now()
);

-- Global user profile created automatically on sign-up (see handle_new_user trigger).
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#02B906',
  created_at   timestamptz DEFAULT now()
);

-- Friend leagues. Each quiniela is its own independent competition.
CREATE TABLE quinielas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  is_active  boolean DEFAULT true
);

-- Per-quiniela membership.
-- Leaderboard stats (total_pts … rank_change) are recomputed by
-- refresh_quiniela_leaderboard() each time a match finishes and written here.
-- Reads are O(1) — no aggregation at query time.
CREATE TABLE quiniela_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiniela_id    uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   text NOT NULL,
  avatar_color   text NOT NULL DEFAULT '#02B906',
  joined_at      timestamptz DEFAULT now(),
  -- ── Leaderboard stats (server-maintained) ──
  total_pts      integer      NOT NULL DEFAULT 0,
  exact_count    integer      NOT NULL DEFAULT 0,  -- 5-pt hits
  correct_count  integer      NOT NULL DEFAULT 0,  -- 3-pt hits
  wrong_count    integer      NOT NULL DEFAULT 0,  -- 0-pt hits on finished matches
  scored_matches integer      NOT NULL DEFAULT 0,  -- finished matches that had this user's pick
  accuracy       numeric(5,2) NOT NULL DEFAULT 0,  -- (exact+correct)/scored_matches*100
  rank           integer,
  prev_rank      integer,
  rank_change    integer,                          -- prev_rank - rank (positive = moved up)
  UNIQUE(quiniela_id, user_id)
);

-- One row per user per quiniela = predictions are locked.
-- Insert is blocked by RLS once a submission row exists.
CREATE TABLE prediction_submissions (
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY(quiniela_id, user_id)
);

-- Match score predictions.
-- pick_home / pick_away always represent the predicted 90-min score.
-- pick_penalties_winner (team TLA) is only set for KO matches where
-- the user predicts a draw and must nominate who advances on penalties.
CREATE TABLE predictions (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  quiniela_id           uuid    NOT NULL REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id               uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id              integer NOT NULL REFERENCES matches(id),
  pick_home             integer NOT NULL CHECK (pick_home >= 0),
  pick_away             integer NOT NULL CHECK (pick_away >= 0),
  pick_penalties_winner text,   -- team TLA; NULL for group stage or non-draw KO picks
  submitted_at          timestamptz DEFAULT now(),
  UNIQUE(quiniela_id, user_id, match_id)
);

-- One golden-boot pick per user per quiniela, locked on submission.
CREATE TABLE top_scorer_predictions (
  quiniela_id  uuid REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name  text NOT NULL,
  player_team  text REFERENCES teams(code),
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY(quiniela_id, user_id)
);

-- One row per (quiniela, user, match) after each match finishes.
-- cumulative_pts = total points up to and including that match.
-- Powers sparklines and "rank at any past moment" queries.
CREATE TABLE leaderboard_snapshots (
  quiniela_id    uuid    NOT NULL REFERENCES quinielas(id) ON DELETE CASCADE,
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id       integer NOT NULL REFERENCES matches(id),
  cumulative_pts integer NOT NULL DEFAULT 0,
  rank_at_moment integer NOT NULL,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (quiniela_id, user_id, match_id)
);

-- ── Functions ─────────────────────────────────────────────────────────────────

-- Returns the points earned for one prediction against a finished match result.
-- Returns NULL when the match result is not yet available.
--
-- Scoring:
--   Exact 90-min score                         → 5 pts
--   Correct 90-min result (wrong exact score)  → 3 pts
--   Correct penalties winner (KO only)         → +2 bonus
CREATE OR REPLACE FUNCTION prediction_points(
  p_pick_home             integer,
  p_pick_away             integer,
  p_pick_penalties_winner text,
  p_home_team_code        text,
  p_away_team_code        text,
  p_score_home_regular    integer,
  p_score_away_regular    integer,
  p_winner                text,
  p_duration              text
) RETURNS integer
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  pts integer := 0;
BEGIN
  IF p_score_home_regular IS NULL OR p_score_away_regular IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_pick_home = p_score_home_regular AND p_pick_away = p_score_away_regular THEN
    pts := 5;
  ELSIF SIGN(p_pick_home - p_pick_away) = SIGN(p_score_home_regular - p_score_away_regular) THEN
    pts := 3;
  END IF;

  IF p_duration = 'PENALTY_SHOOTOUT' AND p_pick_penalties_winner IS NOT NULL THEN
    IF (p_pick_penalties_winner = p_home_team_code AND p_winner = 'HOME_TEAM')
    OR (p_pick_penalties_winner = p_away_team_code AND p_winner = 'AWAY_TEAM')
    THEN
      pts := pts + 2;
    END IF;
  END IF;

  RETURN pts;
END;
$$;

-- Recomputes all leaderboard stats for every member in one quiniela and
-- appends a history snapshot row. Called by the trigger on match finish.
--
-- All members (including those with no predictions) are ranked so the
-- leaderboard is always complete.
CREATE OR REPLACE FUNCTION refresh_quiniela_leaderboard(
  p_quiniela_id uuid,
  p_match_id    integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Carry current rank forward before overwriting it
  UPDATE quiniela_members
  SET prev_rank = rank
  WHERE quiniela_id = p_quiniela_id;

  WITH computed AS (
    -- Aggregate per-member stats from all finished matches they predicted
    SELECT
      p.user_id,
      COUNT(*) FILTER (WHERE m.status = 'FINISHED')
        AS scored_matches,
      COALESCE(SUM(
        prediction_points(
          p.pick_home, p.pick_away, p.pick_penalties_winner,
          m.home_team_code, m.away_team_code,
          m.score_home_regular, m.score_away_regular,
          m.winner, m.duration
        )
      ) FILTER (WHERE m.status = 'FINISHED'), 0)
        AS total_pts,
      COUNT(*) FILTER (
        WHERE m.status = 'FINISHED'
          AND p.pick_home = m.score_home_regular
          AND p.pick_away = m.score_away_regular
      ) AS exact_count,
      COUNT(*) FILTER (
        WHERE m.status = 'FINISHED'
          AND NOT (p.pick_home = m.score_home_regular AND p.pick_away = m.score_away_regular)
          AND SIGN(p.pick_home - p.pick_away) = SIGN(m.score_home_regular - m.score_away_regular)
      ) AS correct_count,
      COUNT(*) FILTER (
        WHERE m.status = 'FINISHED'
          AND SIGN(p.pick_home - p.pick_away) <> SIGN(m.score_home_regular - m.score_away_regular)
      ) AS wrong_count
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.quiniela_id = p_quiniela_id
    GROUP BY p.user_id
  ),
  all_members AS (
    -- Include every member so those with no predictions still get a rank
    SELECT
      qm.user_id,
      COALESCE(c.scored_matches, 0) AS scored_matches,
      COALESCE(c.total_pts,      0) AS total_pts,
      COALESCE(c.exact_count,    0) AS exact_count,
      COALESCE(c.correct_count,  0) AS correct_count,
      COALESCE(c.wrong_count,    0) AS wrong_count
    FROM quiniela_members qm
    LEFT JOIN computed c ON c.user_id = qm.user_id
    WHERE qm.quiniela_id = p_quiniela_id
  ),
  ranked AS (
    SELECT
      *,
      CASE WHEN scored_matches > 0
        THEN ROUND((exact_count + correct_count)::numeric / scored_matches * 100, 2)
        ELSE 0
      END AS accuracy,
      RANK() OVER (ORDER BY total_pts DESC) AS new_rank
    FROM all_members
  )
  UPDATE quiniela_members qm
  SET
    total_pts      = r.total_pts,
    exact_count    = r.exact_count,
    correct_count  = r.correct_count,
    wrong_count    = r.wrong_count,
    scored_matches = r.scored_matches,
    accuracy       = r.accuracy,
    rank           = r.new_rank,
    rank_change    = CASE WHEN qm.prev_rank IS NOT NULL THEN qm.prev_rank - r.new_rank ELSE 0 END
  FROM ranked r
  WHERE qm.quiniela_id = p_quiniela_id
    AND qm.user_id = r.user_id;

  -- Append history snapshot for sparkline / rank-at-moment queries
  IF p_match_id IS NOT NULL THEN
    INSERT INTO leaderboard_snapshots
      (quiniela_id, user_id, match_id, cumulative_pts, rank_at_moment)
    SELECT
      qm.quiniela_id, qm.user_id, p_match_id, qm.total_pts, qm.rank
    FROM quiniela_members qm
    WHERE qm.quiniela_id = p_quiniela_id
    ON CONFLICT (quiniela_id, user_id, match_id) DO NOTHING;
  END IF;
END;
$$;

-- Trigger function: when a match flips to FINISHED, refresh every quiniela
-- that has at least one prediction for that match.
CREATE OR REPLACE FUNCTION on_match_finished()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  q_id uuid;
BEGIN
  IF NEW.status = 'FINISHED' AND (OLD.status IS NULL OR OLD.status <> 'FINISHED') THEN
    FOR q_id IN
      SELECT DISTINCT quiniela_id FROM predictions WHERE match_id = NEW.id
    LOOP
      PERFORM refresh_quiniela_leaderboard(q_id, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_finished
  AFTER UPDATE OF status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION on_match_finished();

-- Auto-creates a profiles row when Supabase registers a new auth user.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────

-- teams and matches are public reference data — no RLS needed.

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE quinielas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiniela_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_scorer_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "users read own profile"   ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Quinielas
CREATE POLICY "members read quiniela" ON quinielas
  FOR SELECT USING (
    id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

-- Quiniela members (leaderboard visible to all members in the same quiniela)
CREATE POLICY "members read members" ON quiniela_members
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

-- Predictions: all quiniela members can read; only owner can write before lock
CREATE POLICY "members read all predictions" ON predictions
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

-- Prediction submissions
CREATE POLICY "users manage own submission" ON prediction_submissions
  FOR ALL USING (user_id = auth.uid());

-- Top scorer
CREATE POLICY "members read top scorer" ON top_scorer_predictions
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

CREATE POLICY "users manage own top scorer" ON top_scorer_predictions
  FOR ALL USING (user_id = auth.uid());

-- Leaderboard history
CREATE POLICY "members read leaderboard snapshots" ON leaderboard_snapshots
  FOR SELECT USING (
    quiniela_id IN (SELECT quiniela_id FROM quiniela_members WHERE user_id = auth.uid())
  );

-- ── Seed: 48 teams ────────────────────────────────────────────────────────────
-- iso2 notes:
--   SUI → 'ch'     (Switzerland / Confoederatio Helvetica)
--   ALG → 'dz'     (Algeria)
--   CRO → 'hr'     (Croatia)
--   SCO → 'gb-sct' (no ISO 3166-1 country code; subdivision tag for flag CDNs)
--   ENG → 'gb-eng' (same)

INSERT INTO teams (code, iso2, name, color, group_id) VALUES
  ('MEX', 'mx',     'Mexico',              '#006847', 'A'),
  ('RSA', 'za',     'South Africa',        '#007A4D', 'A'),
  ('KOR', 'kr',     'South Korea',         '#C60C30', 'A'),
  ('CZE', 'cz',     'Czechia',             '#D7141A', 'A'),
  ('CAN', 'ca',     'Canada',              '#FF0000', 'B'),
  ('BIH', 'ba',     'Bosnia-Herzegovina',  '#002B7F', 'B'),
  ('QAT', 'qa',     'Qatar',               '#8D1B3D', 'B'),
  ('SUI', 'ch',     'Switzerland',         '#E8112D', 'B'),
  ('BRA', 'br',     'Brazil',              '#009C3B', 'C'),
  ('MAR', 'ma',     'Morocco',             '#C1272D', 'C'),
  ('HAI', 'ht',     'Haiti',               '#00209F', 'C'),
  ('SCO', 'gb-sct', 'Scotland',            '#003399', 'C'),
  ('USA', 'us',     'United States',       '#2A398D', 'D'),
  ('PAR', 'py',     'Paraguay',            '#D52B1E', 'D'),
  ('AUS', 'au',     'Australia',           '#00843D', 'D'),
  ('TUR', 'tr',     'Turkey',              '#E30A17', 'D'),
  ('GER', 'de',     'Germany',             '#1A1A22', 'E'),
  ('CUW', 'cw',     'Curaçao',             '#003DA5', 'E'),
  ('CIV', 'ci',     'Ivory Coast',         '#F77F00', 'E'),
  ('ECU', 'ec',     'Ecuador',             '#FFD100', 'E'),
  ('NED', 'nl',     'Netherlands',         '#FF6600', 'F'),
  ('JPN', 'jp',     'Japan',               '#BC002D', 'F'),
  ('SWE', 'se',     'Sweden',              '#006AA7', 'F'),
  ('TUN', 'tn',     'Tunisia',             '#E70013', 'F'),
  ('BEL', 'be',     'Belgium',             '#EF3340', 'G'),
  ('EGY', 'eg',     'Egypt',               '#CE1126', 'G'),
  ('IRN', 'ir',     'Iran',                '#239F40', 'G'),
  ('NZL', 'nz',     'New Zealand',         '#00247D', 'G'),
  ('ESP', 'es',     'Spain',               '#AA151B', 'H'),
  ('CPV', 'cv',     'Cape Verde Islands',  '#003893', 'H'),
  ('KSA', 'sa',     'Saudi Arabia',        '#006C35', 'H'),
  ('URY', 'uy',     'Uruguay',             '#5EB6E4', 'H'),
  ('FRA', 'fr',     'France',              '#002395', 'I'),
  ('SEN', 'sn',     'Senegal',             '#00853F', 'I'),
  ('IRQ', 'iq',     'Iraq',                '#BB0000', 'I'),
  ('NOR', 'no',     'Norway',              '#EF2B2D', 'I'),
  ('ARG', 'ar',     'Argentina',           '#74ACDF', 'J'),
  ('ALG', 'dz',     'Algeria',             '#006233', 'J'),
  ('AUT', 'at',     'Austria',             '#ED2939', 'J'),
  ('JOR', 'jo',     'Jordan',              '#007A3D', 'J'),
  ('POR', 'pt',     'Portugal',            '#006600', 'K'),
  ('COD', 'cd',     'Congo DR',            '#007FFF', 'K'),
  ('UZB', 'uz',     'Uzbekistan',          '#1EB53A', 'K'),
  ('COL', 'co',     'Colombia',            '#FCD116', 'K'),
  ('ENG', 'gb-eng', 'England',             '#CF081F', 'L'),
  ('CRO', 'hr',     'Croatia',             '#CC3333', 'L'),
  ('GHA', 'gh',     'Ghana',               '#006B3F', 'L'),
  ('PAN', 'pa',     'Panama',              '#DB0020', 'L');

-- ── Seed: 72 group-stage matches ─────────────────────────────────────────────
-- utc_date is converted from the display times (EDT = UTC-4).
-- Finished/live scores are from mock data; upcoming scores are NULL.
-- The API sync Edge Function will overwrite these with authoritative values.

INSERT INTO matches (
  id, stage, group_name, matchday,
  home_team_code, away_team_code,
  utc_date, status,
  score_home_regular, score_away_regular, duration, winner,
  display_date, display_time
) VALUES
  -- ── Matchday 1 ──────────────────────────────────────────────────────────
  (537327,'GROUP_STAGE','A',1,'MEX','RSA','2026-06-11T20:00:00Z','FINISHED', 2,1,'REGULAR','HOME_TEAM','Jun 11','FT'),
  (537328,'GROUP_STAGE','A',1,'KOR','CZE','2026-06-11T23:00:00Z','FINISHED', 0,0,'REGULAR','DRAW',     'Jun 11','FT'),
  (537333,'GROUP_STAGE','B',1,'CAN','BIH','2026-06-12T20:00:00Z','FINISHED', 2,0,'REGULAR','HOME_TEAM','Jun 12','FT'),
  (537345,'GROUP_STAGE','D',1,'USA','PAR','2026-06-12T23:00:00Z','FINISHED', 1,0,'REGULAR','HOME_TEAM','Jun 12','FT'),
  (537334,'GROUP_STAGE','B',1,'QAT','SUI','2026-06-13T20:00:00Z','FINISHED', 0,3,'REGULAR','AWAY_TEAM','Jun 13','FT'),
  (537339,'GROUP_STAGE','C',1,'BRA','MAR','2026-06-13T23:00:00Z','FINISHED', 2,1,'REGULAR','HOME_TEAM','Jun 13','FT'),
  (537340,'GROUP_STAGE','C',1,'HAI','SCO','2026-06-13T23:00:00Z','IN_PLAY',  0,0, NULL,    NULL,       'Jun 13','74'''),
  (537346,'GROUP_STAGE','D',1,'AUS','TUR','2026-06-14T04:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 14','00:00'),
  (537351,'GROUP_STAGE','E',1,'GER','CUW','2026-06-14T17:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 14','13:00'),
  (537357,'GROUP_STAGE','F',1,'NED','JPN','2026-06-14T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 14','16:00'),
  (537352,'GROUP_STAGE','E',1,'CIV','ECU','2026-06-14T23:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 14','19:00'),
  (537358,'GROUP_STAGE','F',1,'SWE','TUN','2026-06-15T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 14','22:00'),
  (537369,'GROUP_STAGE','H',1,'ESP','CPV','2026-06-15T16:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 15','12:00'),
  (537363,'GROUP_STAGE','G',1,'BEL','EGY','2026-06-15T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 15','15:00'),
  (537370,'GROUP_STAGE','H',1,'KSA','URY','2026-06-15T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 15','18:00'),
  (537364,'GROUP_STAGE','G',1,'IRN','NZL','2026-06-16T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 15','21:00'),
  (537391,'GROUP_STAGE','I',1,'FRA','SEN','2026-06-16T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 16','15:00'),
  (537392,'GROUP_STAGE','I',1,'IRQ','NOR','2026-06-16T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 16','18:00'),
  (537397,'GROUP_STAGE','J',1,'ARG','ALG','2026-06-17T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 16','21:00'),
  (537398,'GROUP_STAGE','J',1,'AUT','JOR','2026-06-17T04:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 17','00:00'),
  (537403,'GROUP_STAGE','K',1,'POR','COD','2026-06-17T17:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 17','13:00'),
  (537409,'GROUP_STAGE','L',1,'ENG','CRO','2026-06-17T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 17','16:00'),
  (537410,'GROUP_STAGE','L',1,'GHA','PAN','2026-06-17T23:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 17','19:00'),
  (537404,'GROUP_STAGE','K',1,'UZB','COL','2026-06-18T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 17','22:00'),
  -- ── Matchday 2 ──────────────────────────────────────────────────────────
  (537329,'GROUP_STAGE','A',2,'CZE','RSA','2026-06-18T16:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 18','12:00'),
  (537335,'GROUP_STAGE','B',2,'SUI','BIH','2026-06-18T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 18','15:00'),
  (537336,'GROUP_STAGE','B',2,'CAN','QAT','2026-06-18T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 18','18:00'),
  (537330,'GROUP_STAGE','A',2,'MEX','KOR','2026-06-19T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 18','21:00'),
  (537348,'GROUP_STAGE','D',2,'USA','AUS','2026-06-19T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 19','15:00'),
  (537342,'GROUP_STAGE','C',2,'SCO','MAR','2026-06-19T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 19','18:00'),
  (537341,'GROUP_STAGE','C',2,'BRA','HAI','2026-06-20T00:30:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 19','20:30'),
  (537347,'GROUP_STAGE','D',2,'TUR','PAR','2026-06-20T03:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 19','23:00'),
  (537359,'GROUP_STAGE','F',2,'NED','SWE','2026-06-20T17:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 20','13:00'),
  (537353,'GROUP_STAGE','E',2,'GER','CIV','2026-06-20T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 20','16:00'),
  (537354,'GROUP_STAGE','E',2,'ECU','CUW','2026-06-21T00:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 20','20:00'),
  (537360,'GROUP_STAGE','F',2,'TUN','JPN','2026-06-21T04:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 21','00:00'),
  (537371,'GROUP_STAGE','H',2,'ESP','KSA','2026-06-21T16:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 21','12:00'),
  (537365,'GROUP_STAGE','G',2,'BEL','IRN','2026-06-21T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 21','15:00'),
  (537372,'GROUP_STAGE','H',2,'URY','CPV','2026-06-21T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 21','18:00'),
  (537366,'GROUP_STAGE','G',2,'NZL','EGY','2026-06-22T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 21','21:00'),
  (537399,'GROUP_STAGE','J',2,'ARG','AUT','2026-06-22T17:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 22','13:00'),
  (537393,'GROUP_STAGE','I',2,'FRA','IRQ','2026-06-22T21:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 22','17:00'),
  (537394,'GROUP_STAGE','I',2,'NOR','SEN','2026-06-23T00:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 22','20:00'),
  (537400,'GROUP_STAGE','J',2,'JOR','ALG','2026-06-23T03:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 22','23:00'),
  (537405,'GROUP_STAGE','K',2,'POR','UZB','2026-06-23T17:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 23','13:00'),
  (537411,'GROUP_STAGE','L',2,'ENG','GHA','2026-06-23T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 23','16:00'),
  (537412,'GROUP_STAGE','L',2,'PAN','CRO','2026-06-23T23:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 23','19:00'),
  (537406,'GROUP_STAGE','K',2,'COL','COD','2026-06-24T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 23','22:00'),
  -- ── Matchday 3 ──────────────────────────────────────────────────────────
  (537337,'GROUP_STAGE','B',3,'SUI','CAN','2026-06-24T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','15:00'),
  (537338,'GROUP_STAGE','B',3,'BIH','QAT','2026-06-24T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','15:00'),
  (537344,'GROUP_STAGE','C',3,'MAR','HAI','2026-06-24T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','18:00'),
  (537343,'GROUP_STAGE','C',3,'SCO','BRA','2026-06-24T22:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','18:00'),
  (537331,'GROUP_STAGE','A',3,'CZE','MEX','2026-06-25T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','21:00'),
  (537332,'GROUP_STAGE','A',3,'RSA','KOR','2026-06-25T01:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 24','21:00'),
  (537355,'GROUP_STAGE','E',3,'ECU','GER','2026-06-25T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','16:00'),
  (537356,'GROUP_STAGE','E',3,'CUW','CIV','2026-06-25T20:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','16:00'),
  (537361,'GROUP_STAGE','F',3,'TUN','NED','2026-06-25T23:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','19:00'),
  (537362,'GROUP_STAGE','F',3,'JPN','SWE','2026-06-25T23:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','19:00'),
  (537349,'GROUP_STAGE','D',3,'TUR','USA','2026-06-26T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','22:00'),
  (537350,'GROUP_STAGE','D',3,'PAR','AUS','2026-06-26T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 25','22:00'),
  (537395,'GROUP_STAGE','I',3,'NOR','FRA','2026-06-26T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','15:00'),
  (537396,'GROUP_STAGE','I',3,'SEN','IRQ','2026-06-26T19:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','15:00'),
  (537373,'GROUP_STAGE','H',3,'URY','ESP','2026-06-27T00:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','20:00'),
  (537374,'GROUP_STAGE','H',3,'CPV','KSA','2026-06-27T00:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','20:00'),
  (537367,'GROUP_STAGE','G',3,'NZL','BEL','2026-06-27T03:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','23:00'),
  (537368,'GROUP_STAGE','G',3,'EGY','IRN','2026-06-27T03:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 26','23:00'),
  (537413,'GROUP_STAGE','L',3,'PAN','ENG','2026-06-27T21:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','17:00'),
  (537414,'GROUP_STAGE','L',3,'CRO','GHA','2026-06-27T21:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','17:00'),
  (537407,'GROUP_STAGE','K',3,'COL','POR','2026-06-27T23:30:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','19:30'),
  (537408,'GROUP_STAGE','K',3,'COD','UZB','2026-06-27T23:30:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','19:30'),
  (537401,'GROUP_STAGE','J',3,'JOR','ARG','2026-06-28T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','22:00'),
  (537402,'GROUP_STAGE','J',3,'ALG','AUT','2026-06-28T02:00:00Z','TIMED',   NULL,NULL,NULL,NULL,       'Jun 27','22:00');

-- Knockout-stage rows (IDs TBD) will be inserted by the API sync Edge Function
-- once the group stage completes and bracket slots are known.
