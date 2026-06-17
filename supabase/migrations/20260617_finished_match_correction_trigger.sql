-- on_match_finished previously only refreshed the leaderboard on the
-- transition into FINISHED. sync-live-matches now rechecks a match for a
-- short window after it's marked FINISHED (RECHECK_WINDOW_MS) to catch a
-- score that arrives a beat behind the final-whistle flag (observed
-- 2026-06-16: IRQ-NOR posted FINISHED 1-3, corrected to 1-4 a tick later).
-- That correction updates `matches` while status stays 'FINISHED', which the
-- old trigger condition ignored, so the leaderboard would silently keep
-- stale points. This widens the trigger to also fire when the score,
-- winner, or duration changes on an already-FINISHED row.
CREATE OR REPLACE FUNCTION public.on_match_finished()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  q_id uuid;
BEGIN
  IF NEW.status = 'FINISHED' AND (
    OLD.status IS NULL OR OLD.status <> 'FINISHED'
    OR OLD.score_home_regular IS DISTINCT FROM NEW.score_home_regular
    OR OLD.score_away_regular IS DISTINCT FROM NEW.score_away_regular
    OR OLD.score_home_et IS DISTINCT FROM NEW.score_home_et
    OR OLD.score_away_et IS DISTINCT FROM NEW.score_away_et
    OR OLD.winner IS DISTINCT FROM NEW.winner
    OR OLD.duration IS DISTINCT FROM NEW.duration
  ) THEN
    FOR q_id IN
      SELECT DISTINCT quiniela_id FROM predictions WHERE match_id = NEW.id
    LOOP
      PERFORM refresh_quiniela_leaderboard(q_id, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
