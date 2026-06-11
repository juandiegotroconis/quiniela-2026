-- Make leaderboard ranks unique (no ties).
--
-- Previously `refresh_quiniela_leaderboard` used RANK() OVER (ORDER BY total_pts DESC),
-- which assigns the same rank to tied members and skips the next rank number
-- (e.g. 1, 2, 2, 4). The frontend (LeaderboardScreen.tsx) displays this rank
-- directly, so ties showed up as duplicate rank numbers.
--
-- New tiebreak order, applied via ROW_NUMBER():
--   1. total_pts DESC        (more points wins)
--   2. exact_count DESC      (more exact-score hits wins)
--   3. correct_count DESC    (more correct-tendency hits wins)
--   4. joined_at ASC         (earlier member wins, final deterministic tiebreak)
--
-- Also adds `SET search_path = public` (was previously unset, flagged by the
-- Supabase security linter as function_search_path_mutable).

create or replace function public.refresh_quiniela_leaderboard(p_quiniela_id uuid, p_match_id integer DEFAULT NULL::integer)
 returns void
 language plpgsql
 set search_path = public
as $function$
BEGIN
  UPDATE quiniela_members
  SET prev_rank = rank
  WHERE quiniela_id = p_quiniela_id;

  WITH computed AS (
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
    SELECT
      qm.user_id,
      qm.joined_at,
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
      ROW_NUMBER() OVER (
        ORDER BY total_pts DESC, exact_count DESC, correct_count DESC, joined_at ASC
      ) AS new_rank
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
$function$;
