-- Centralizes total prediction scoring into a single function and excludes
-- LAST_32 from the knockout matchup bonus (those fixtures are predefined —
-- bracket "guessing" there shouldn't earn points). See the frontend notes
-- this migration was paired with for the full rationale and worked examples
-- (Carlos David / Brazil-Japan LAST_32 case).
--
-- Adds public.prediction_total_points(...): wraps prediction_points_v2 (main
-- result points, unchanged) and adds the matchup bonus only when result
-- points = 0 AND stage is not GROUP_STAGE/LAST_32. Non-stacking: any nonzero
-- result points short-circuits the bonus.
--
-- Re-points refresh_quiniela_leaderboard at prediction_total_points instead
-- of computing the matchup bonus inline, so the leaderboard total is the one
-- canonical scoring function. exact_count/correct_count/wrong_count/accuracy
-- are intentionally untouched — still derived from score_home_regular only.

create or replace function public.prediction_total_points(
  p_stage text,
  p_score_home_regular integer,
  p_score_away_regular integer,
  p_score_home_et integer,
  p_score_away_et integer,
  p_winner text,
  p_pick_home integer,
  p_pick_away integer,
  p_pick_penalties_winner text,
  p_home_team_code text,
  p_away_team_code text,
  p_pred_home_team_code text,
  p_pred_away_team_code text
)
returns integer
language plpgsql
immutable
set search_path to ''
as $$
declare
  v_main_points integer;
begin
  v_main_points := public.prediction_points_v2(
    p_stage,
    p_score_home_regular,
    p_score_away_regular,
    p_score_home_et,
    p_score_away_et,
    p_winner,
    p_pick_home,
    p_pick_away,
    p_pick_penalties_winner,
    p_home_team_code,
    p_away_team_code
  );

  if v_main_points is null then
    return null;
  end if;

  -- Matchup bonus rewards bracket knowledge only after the predefined LAST_32.
  -- It never stacks with match-result points.
  if v_main_points = 0
     and p_stage not in ('GROUP_STAGE', 'LAST_32') then
    return coalesce(public.bracket_bonus_points(
      p_pred_home_team_code,
      p_pred_away_team_code,
      p_home_team_code,
      p_away_team_code
    ), 0);
  end if;

  return v_main_points;
end;
$$;

comment on function public.prediction_total_points(
  text, integer, integer, integer, integer, text,
  integer, integer, text, text, text, text, text
) is
'Total quiniela points for one prediction: result points via prediction_points_v2 plus eligible matchup bonus from LAST_16 onward only when result points are 0. LAST_32 matchup bonus is intentionally ignored because those fixtures are predefined.';


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
      public.prediction_points_v2(
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
        m.away_team_code
      ) as main_points,
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
  all_members as (
    select
      qm.user_id,
      qm.joined_at,
      coalesce(c.scored_matches, 0) as scored_matches,
      coalesce(c.total_pts,      0) as total_pts,
      coalesce(c.exact_count,    0) as exact_count,
      coalesce(c.correct_count,  0) as correct_count,
      coalesce(c.wrong_count,    0) as wrong_count
    from quiniela_members qm
    left join computed c on c.user_id = qm.user_id
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

comment on function public.refresh_quiniela_leaderboard(uuid, integer) is
'Recomputes leaderboard totals using prediction_total_points. Regular-score counters remain based on score_home_regular/score_away_regular by design.';

comment on function public.prediction_points(
  integer, integer, text, text, text, integer, integer, text, text
) is
'DEPRECATED: legacy scorer retained for compatibility. Use prediction_points_v2 for match-result points and prediction_total_points for final leaderboard scoring.';

revoke execute on function public.prediction_points(
  integer, integer, text, text, text, integer, integer, text, text
) from anon, authenticated;
