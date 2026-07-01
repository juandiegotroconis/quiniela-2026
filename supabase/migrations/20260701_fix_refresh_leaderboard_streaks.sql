-- The 20260630_centralize_total_prediction_scoring migration rewrote
-- refresh_quiniela_leaderboard to use prediction_total_points but accidentally
-- dropped the compute_member_streaks call, leaving best_streak / worst_streak /
-- current_streak frozen after every match.  This restores streak computation.

create or replace function public.refresh_quiniela_leaderboard(
  p_quiniela_id uuid,
  p_match_id integer default null::integer
)
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  update quiniela_members
  set prev_rank = rank
  where quiniela_id = p_quiniela_id;

  with per_match as (
    select
      p.user_id,
      m.status,
      m.stage,
      m.score_home_regular,
      m.score_away_regular,
      m.score_home_et,
      m.score_away_et,
      m.winner,
      m.home_team_code,
      m.away_team_code,
      p.pick_home,
      p.pick_away,
      p.pick_penalties_winner,
      public.prediction_total_points(
        m.stage,
        m.score_home_regular,
        m.score_away_regular,
        m.score_home_et,
        m.score_away_et,
        m.winner,
        p.pick_home,
        p.pick_away,
        p.pick_penalties_winner,
        m.home_team_code,
        m.away_team_code,
        bp.pred_home_team_code,
        bp.pred_away_team_code
      ) as total_points
    from predictions p
    join matches m on m.id = p.match_id
    left join bracket_predictions bp
      on bp.user_id = p.user_id
     and bp.quiniela_id = p.quiniela_id
     and bp.match_id = p.match_id
    where p.quiniela_id = p_quiniela_id
  ),
  computed as (
    select
      user_id,
      count(*) filter (where status = 'FINISHED')
        as scored_matches,
      coalesce(sum(total_points) filter (where status = 'FINISHED'), 0)
        as total_pts,
      count(*) filter (
        where status = 'FINISHED'
          and pick_home = score_home_regular
          and pick_away = score_away_regular
      ) as exact_count,
      count(*) filter (
        where status = 'FINISHED'
          and not (pick_home = score_home_regular and pick_away = score_away_regular)
          and sign(pick_home - pick_away) = sign(score_home_regular - score_away_regular)
      ) as correct_count,
      count(*) filter (
        where status = 'FINISHED'
          and sign(pick_home - pick_away) <> sign(score_home_regular - score_away_regular)
      ) as wrong_count
    from per_match
    group by user_id
  ),
  streaks as (
    select * from public.compute_member_streaks(p_quiniela_id)
  ),
  all_members as (
    select
      qm.user_id,
      qm.joined_at,
      coalesce(c.scored_matches, 0) as scored_matches,
      coalesce(c.total_pts,      0) as total_pts,
      coalesce(c.exact_count,    0) as exact_count,
      coalesce(c.correct_count,  0) as correct_count,
      coalesce(c.wrong_count,    0) as wrong_count,
      coalesce(s.best_streak,    0) as best_streak,
      coalesce(s.worst_streak,   0) as worst_streak,
      coalesce(s.current_streak, 0) as current_streak
    from quiniela_members qm
    left join computed c on c.user_id = qm.user_id
    left join streaks s on s.user_id = qm.user_id
    where qm.quiniela_id = p_quiniela_id
  ),
  ranked as (
    select
      *,
      case when scored_matches > 0
        then round((exact_count + correct_count)::numeric / scored_matches * 100, 2)
        else 0
      end as accuracy,
      row_number() over (
        order by total_pts desc, exact_count desc, correct_count desc, joined_at asc
      ) as new_rank
    from all_members
  )
  update quiniela_members qm
  set
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
    rank_change    = case when qm.prev_rank is not null then qm.prev_rank - r.new_rank else 0 end
  from ranked r
  where qm.quiniela_id = p_quiniela_id
    and qm.user_id = r.user_id;

  if p_match_id is not null then
    insert into leaderboard_snapshots
      (quiniela_id, user_id, match_id, cumulative_pts, rank_at_moment)
    select
      qm.quiniela_id,
      qm.user_id,
      p_match_id,
      qm.total_pts,
      qm.rank
    from quiniela_members qm
    where qm.quiniela_id = p_quiniela_id
    on conflict (quiniela_id, user_id, match_id) do nothing;
  end if;
end;
$$;
