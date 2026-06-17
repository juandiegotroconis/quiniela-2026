-- Reconciles this migration history with the live schedule: at some point
-- after 20260611_sync_live_matches_cron.sql was applied, both cron jobs were
-- changed directly (outside of a migration) from every 2 minutes to every
-- minute. Keeping every minute — tighter polling shrinks the window in
-- which a source can flag a match FINISHED with a score that hasn't caught
-- up yet (see the RECHECK_WINDOW_MS safeguard added to sync-live-matches
-- alongside this migration) — so this codifies that schedule going forward
-- instead of reverting it.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'sync-live-matches-evening'),
  schedule := '* 16-23 * * *'
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'sync-live-matches-overnight'),
  schedule := '* 0-6 * * *'
);
