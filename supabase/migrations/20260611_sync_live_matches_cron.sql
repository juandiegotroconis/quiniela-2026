-- Schedules the sync-live-matches Edge Function via pg_cron + pg_net.
-- Requires the pg_cron and pg_net extensions (enabled via the dashboard).
--
-- Window rationale: earliest kickoff is 16:00 UTC, latest is 04:00 UTC.
-- A 04:00 match plus halftime/stoppage can end shortly after 06:00, so the
-- overnight job runs through 06:58 to guarantee the FINISHED transition is
-- captured (out-of-window ticks early-exit in the function without calling
-- the football-data.org API).
--
-- The function itself authenticates to football-data.org with the
-- FOOTBALL_DATA_KEY Edge Function secret (not stored in the database).

-- Secrets read by the cron job bodies (anon key is public by design).
select vault.create_secret(
  'https://ljnfquqjvlbiynzxdedq.supabase.co',
  'project_url'
);
select vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmZxdXFqdmxiaXluenhkZWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzYwNzIsImV4cCI6MjA5NTMxMjA3Mn0.x_V50POF2LksooqoteNCe5YToEhG2M5fwARMIBWMdI0',
  'anon_key'
);

-- Every 2 minutes, 16:00–23:58 UTC.
select cron.schedule(
  'sync-live-matches-evening',
  '*/2 16-23 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-live-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);

-- Every 2 minutes, 00:00–06:58 UTC.
select cron.schedule(
  'sync-live-matches-overnight',
  '*/2 0-6 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-live-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);
