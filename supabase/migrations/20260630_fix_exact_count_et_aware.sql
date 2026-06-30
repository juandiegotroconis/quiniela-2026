-- Fixes exact_count/correct_count/wrong_count to compare picks against the
-- same "final score" the points system already uses (coalesce(score_home_et,
-- score_home_regular)), not score_home_regular alone.
--
-- Two compounding bugs this closes:
--   1. Any knockout match decided in extra time (no shootout) had its final
--      score frozen in score_home_regular at the 90' score once ET started —
--      score_home_et holds the actual final. A user who exactly predicted the
--      ET-decided final score (5 pts via prediction_points_v2/total_points)
--      was counted as WRONG here, since their pick never matched the stale
--      90' score.
--   2. Any knockout draw decided by penalties: the picked score equaling the
--      drawn score is "exact" regardless of the penalty-shootout pick (that's
--      a separate guess — see prediction_points_v2's 4-pt "half" vs 5-pt
--      "penalty_exact" split). Comparing against the coalesced final score
--      already captures this correctly with no penalty-specific casing,
--      since exact_count never looked at the shootout winner to begin with —
--      it was only ever broken by comparing against the wrong score column.
--
-- Identical to 20260630_centralize_total_prediction_scoring.sql except the
-- exact/correct/wrong filters now read final_home_score/final_away_score
-- (added to per_match) instead of score_home_regular/score_away_regular.
-- GROUP_STAGE matches are unaffected (score_home_et is always null there, so
-- the coalesce is a no-op).

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
      coalesce(m.score_home_et, m.score_home_regular) as final_home_score,
      coalesce(m.score_away_et, m.score_away_regular) as final_away_score,
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
          and pick_home = final_home_score
          and pick_away = final_away_score
      ) as exact_count,
      count(*) filter (
        where status = 'FINISHED'
          and not (pick_home = final_home_score and pick_away = final_away_score)
          and sign(pick_home - pick_away) = sign(final_home_score - final_away_score)
      ) as correct_count,
      count(*) filter (
        where status = 'FINISHED'
          and sign(pick_home - pick_away) <> sign(final_home_score - final_away_score)
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
'Recomputes leaderboard totals using prediction_total_points. exact_count/correct_count/wrong_count compare against the ET-aware final score (coalesce(score_home_et, score_home_regular)), matching the score the points functions use — penalty-shootout winner does not affect exact/correct/wrong, only the 4-vs-5-point split within prediction_points_v2.';

-- One-time backfill: recompute every quiniela's stats under the corrected
-- logic so existing exact_count/correct_count/wrong_count/rank values reflect
-- it immediately, without waiting for the next match to finish.
do $$
declare
  v_quiniela_id uuid;
begin
  for v_quiniela_id in select id from public.quinielas loop
    perform public.refresh_quiniela_leaderboard(v_quiniela_id);
  end loop;
end;
$$;
