-- Adds a "current streak" alongside the existing all-time best/worst streaks.
--
-- current_streak is signed: a positive N means the member is currently on a
-- run of N consecutive hits (their most recent finished match was a hit, and
-- so were the N-1 before it); a negative N means they're currently on a run
-- of N consecutive misses. It's derived from the same chronological
-- hit/miss timeline as best_streak/worst_streak (see 20260617_member_streaks.sql)
-- by taking the last group in that timeline instead of the longest one.

alter table quiniela_members
  add column if not exists current_streak int not null default 0;

create or replace function public.compute_member_streaks(p_quiniela_id uuid)
returns table (user_id uuid, best_streak int, worst_streak int, current_streak int)
language sql
stable
set search_path = public
as $$
  with finished_matches as (
    select id, utc_date, score_home_regular, score_away_regular
    from matches
    where status = 'FINISHED'
  ),
  member_results as (
    select
      qm.user_id,
      fm.utc_date,
      coalesce(
        (p.pick_home = fm.score_home_regular and p.pick_away = fm.score_away_regular)
        or sign(p.pick_home - p.pick_away) = sign(fm.score_home_regular - fm.score_away_regular),
        false
      ) as is_hit
    from quiniela_members qm
    cross join finished_matches fm
    left join predictions p
      on p.match_id = fm.id
     and p.user_id = qm.user_id
     and p.quiniela_id = qm.quiniela_id
    where qm.quiniela_id = p_quiniela_id
  ),
  flagged as (
    select
      user_id,
      utc_date,
      is_hit,
      lag(is_hit) over (partition by user_id order by utc_date) as prev_hit
    from member_results
  ),
  grouped as (
    select
      user_id,
      utc_date,
      is_hit,
      sum(case when prev_hit is distinct from is_hit then 1 else 0 end) over (
        partition by user_id order by utc_date
      ) as grp
    from flagged
  ),
  streak_groups as (
    select
      user_id,
      is_hit,
      grp,
      count(*) as len,
      row_number() over (partition by user_id order by grp desc) as rn_desc
    from grouped
    group by user_id, is_hit, grp
  ),
  last_group as (
    select user_id, is_hit, len
    from streak_groups
    where rn_desc = 1
  )
  select
    qm.user_id,
    coalesce(max(sg.len) filter (where sg.is_hit), 0) as best_streak,
    coalesce(max(sg.len) filter (where not sg.is_hit), 0) as worst_streak,
    coalesce(max(case when lg.is_hit then lg.len else -lg.len end), 0) as current_streak
  from quiniela_members qm
  left join streak_groups sg on sg.user_id = qm.user_id
  left join last_group lg on lg.user_id = qm.user_id
  where qm.quiniela_id = p_quiniela_id
  group by qm.user_id;
$$;

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
  streaks AS (
    SELECT * FROM compute_member_streaks(p_quiniela_id)
  ),
  all_members AS (
    SELECT
      qm.user_id,
      qm.joined_at,
      COALESCE(c.scored_matches, 0) AS scored_matches,
      COALESCE(c.total_pts,      0) AS total_pts,
      COALESCE(c.exact_count,    0) AS exact_count,
      COALESCE(c.correct_count,  0) AS correct_count,
      COALESCE(c.wrong_count,    0) AS wrong_count,
      COALESCE(s.best_streak,    0) AS best_streak,
      COALESCE(s.worst_streak,   0) AS worst_streak,
      COALESCE(s.current_streak, 0) AS current_streak
    FROM quiniela_members qm
    LEFT JOIN computed c ON c.user_id = qm.user_id
    LEFT JOIN streaks s ON s.user_id = qm.user_id
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
    best_streak    = r.best_streak,
    worst_streak   = r.worst_streak,
    current_streak = r.current_streak,
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
