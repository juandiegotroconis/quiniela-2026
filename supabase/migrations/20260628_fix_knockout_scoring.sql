-- Fixes prediction_points_v2's penalties-winner bug and wires knockout
-- scoring + the bracket matchup bonus into refresh_quiniela_leaderboard.
-- See PENDING.md item 1.
--
-- Bug being fixed: prediction_points_v2 compared p_pick_penalties_winner (a
-- team code, e.g. 'MEX') directly against p_winner ('HOME_TEAM'/'AWAY_TEAM'),
-- so the 5-point "exact ET draw + correct penalties pick" case could never
-- fire. Fixed by adding p_home_team_code/p_away_team_code params and
-- translating the pick to a side before comparing.
--
-- The group-stage branch is untouched, so group-stage point values are
-- identical to the existing draft (already verified against prediction_points
-- as of 2026-06-11 per the original migration's header comment).

drop function if exists public.prediction_points_v2(
  text, int, int, int, int, text, int, int, text
);

create or replace function public.prediction_points_v2(
  p_stage text,
  p_score_home_regular int,
  p_score_away_regular int,
  p_score_home_et int,
  p_score_away_et int,
  p_winner text,
  p_pick_home int,
  p_pick_away int,
  p_pick_penalties_winner text,
  p_home_team_code text,
  p_away_team_code text
) returns int
language plpgsql
immutable
set search_path = ''
as $$
declare
  final_home int;
  final_away int;
  penalties_winner_side text;
begin
  if p_stage = 'GROUP_STAGE' then
    if p_score_home_regular is null or p_score_away_regular is null then
      return null;
    end if;

    if p_pick_home = p_score_home_regular and p_pick_away = p_score_away_regular then
      return 5;
    end if;

    if sign(p_pick_home - p_pick_away) = sign(p_score_home_regular - p_score_away_regular) then
      return 3;
    end if;

    return 0;
  end if;

  -- Knockout: final score is the ET score if the match went to extra time,
  -- otherwise the regular-time score.
  final_home := coalesce(p_score_home_et, p_score_home_regular);
  final_away := coalesce(p_score_away_et, p_score_away_regular);

  if final_home is null or final_away is null then
    return null;
  end if;

  if final_home <> final_away then
    if p_pick_home = final_home and p_pick_away = final_away then
      return 5;
    end if;

    if sign(p_pick_home - p_pick_away) = sign(final_home - final_away) then
      return 3;
    end if;

    return 0;
  end if;

  -- Draw after ET — decided on penalties. Translate the team-code pick to a
  -- side before comparing to p_winner (the actual bug fix).
  penalties_winner_side := case
    when p_pick_penalties_winner = p_home_team_code then 'HOME_TEAM'
    when p_pick_penalties_winner = p_away_team_code then 'AWAY_TEAM'
    else null
  end;

  if p_pick_home = final_home and p_pick_away = final_away then
    if penalties_winner_side = p_winner then
      return 5;
    end if;
    return 4;
  end if;

  if p_pick_home = p_pick_away then
    return 3;
  end if;

  return 0;
end;
$$;

-- Wire prediction_points_v2 + bracket_bonus_points into the leaderboard.
-- Identical to 20260611_leaderboard_unique_rank.sql except for the points
-- computation: main_points now comes from prediction_points_v2 (was
-- prediction_points), and a bracket matchup bonus is added on top whenever
-- a knockout-stage prediction scored 0 (RULES_MATCHUP_* in RulesModal.tsx /
-- src/lib/scoring.ts). exact_count/correct_count/wrong_count are unchanged —
-- they already compare against score_home_regular only for every stage,
-- a pre-existing characteristic this migration doesn't touch.
create or replace function public.refresh_quiniela_leaderboard(p_quiniela_id uuid, p_match_id integer DEFAULT NULL::integer)
 returns void
 language plpgsql
 set search_path = public
as $function$
BEGIN
  UPDATE quiniela_members
  SET prev_rank = rank
  WHERE quiniela_id = p_quiniela_id;

  WITH per_match AS (
    SELECT
      p.user_id,
      m.status,
      m.stage,
      m.score_home_regular,
      m.score_away_regular,
      m.home_team_code,
      m.away_team_code,
      p.pick_home,
      p.pick_away,
      prediction_points_v2(
        m.stage, m.score_home_regular, m.score_away_regular,
        m.score_home_et, m.score_away_et, m.winner,
        p.pick_home, p.pick_away, p.pick_penalties_winner,
        m.home_team_code, m.away_team_code
      ) AS main_points,
      bp.pred_home_team_code,
      bp.pred_away_team_code
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    LEFT JOIN bracket_predictions bp
      ON bp.user_id = p.user_id
     AND bp.quiniela_id = p.quiniela_id
     AND bp.match_id = p.match_id
    WHERE p.quiniela_id = p_quiniela_id
  ),
  scored AS (
    SELECT
      *,
      main_points + CASE
        WHEN stage <> 'GROUP_STAGE' AND main_points = 0
          THEN COALESCE(bracket_bonus_points(pred_home_team_code, pred_away_team_code, home_team_code, away_team_code), 0)
        ELSE 0
      END AS total_points
    FROM per_match
  ),
  computed AS (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE status = 'FINISHED')
        AS scored_matches,
      COALESCE(SUM(total_points) FILTER (WHERE status = 'FINISHED'), 0)
        AS total_pts,
      COUNT(*) FILTER (
        WHERE status = 'FINISHED'
          AND pick_home = score_home_regular
          AND pick_away = score_away_regular
      ) AS exact_count,
      COUNT(*) FILTER (
        WHERE status = 'FINISHED'
          AND NOT (pick_home = score_home_regular AND pick_away = score_away_regular)
          AND SIGN(pick_home - pick_away) = SIGN(score_home_regular - score_away_regular)
      ) AS correct_count,
      COUNT(*) FILTER (
        WHERE status = 'FINISHED'
          AND SIGN(pick_home - pick_away) <> SIGN(score_home_regular - score_away_regular)
      ) AS wrong_count
    FROM scored
    GROUP BY user_id
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

-- ── Manual verification (run in the SQL editor before relying on this) ────
-- 1. Group-stage parity: pick a FINISHED group-stage match + a real pick from
--    `predictions`, and confirm prediction_points_v2 matches the old
--    prediction_points for the same inputs, e.g.:
--
--    select prediction_points_v2(
--      'GROUP_STAGE', m.score_home_regular, m.score_away_regular,
--      null, null, m.winner,
--      p.pick_home, p.pick_away, p.pick_penalties_winner,
--      m.home_team_code, m.away_team_code
--    ) as v2_points,
--    prediction_points(
--      p.pick_home, p.pick_away, p.pick_penalties_winner,
--      m.home_team_code, m.away_team_code,
--      m.score_home_regular, m.score_away_regular, m.winner, m.duration
--    ) as v1_points
--    from predictions p join matches m on m.id = p.match_id
--    where m.stage = 'GROUP_STAGE' and m.status = 'FINISHED'
--    limit 20;
--
-- 2. Penalties-winner fix: synthetic knockout draw decided on penalties,
--    picked team code matches the actual winner side -> should return 5
--    (was capped at 4 before this fix):
--
--    select prediction_points_v2(
--      'LAST_16', 1, 1, 1, 1, 'HOME_TEAM',
--      1, 1, 'MEX',
--      'MEX', 'BRA'
--    ); -- expect 5
--
--    select prediction_points_v2(
--      'LAST_16', 1, 1, 1, 1, 'AWAY_TEAM',
--      1, 1, 'MEX',
--      'MEX', 'BRA'
--    ); -- expect 4 (wrong team picked for penalties)
