-- Schedules the sync-top-scorers Edge Function via pg_cron + pg_net.
-- Reuses the project_url / anon_key Vault secrets created in
-- 20260611_sync_live_matches_cron.sql (do not recreate them).
--
-- Window matches the live-score crons (16:00–06:58 UTC, covering all kickoffs).
-- Every 30 minutes: the Golden Boot board only moves when goals are scored, so
-- a much coarser cadence than the per-minute live-score sync is plenty, and the
-- function itself early-exits (no FIFA call) on ticks with no live/recent match.
--
-- The function authenticates to FIFA's gameday API with the FIFA_GAMEDAY_TOKEN
-- Edge secret (a 24h anonymous token, refreshed out-of-band; see the function
-- header) — not stored in the database.

-- Every 30 minutes, 16:00–23:30 UTC.
select cron.schedule(
  'sync-top-scorers-evening',
  '*/30 16-23 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-top-scorers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);

-- Every 30 minutes, 00:00–06:30 UTC.
select cron.schedule(
  'sync-top-scorers-overnight',
  '*/30 0-6 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-top-scorers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);
