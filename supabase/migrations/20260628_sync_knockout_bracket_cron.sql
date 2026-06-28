-- Schedules the sync-knockout-bracket Edge Function via pg_cron + pg_net.
-- Reuses the project_url / anon_key Vault secrets created in
-- 20260611_sync_live_matches_cron.sql (do not recreate them).
--
-- Unlike the live-score crons, this isn't tied to match hours: FIFA resolves
-- a bracket slot's real teams as soon as the preceding round's results (or
-- group standings) are final, which can happen at any hour. Every 15
-- minutes, all day — the function itself early-exits (no FIFA call) once
-- every knockout match already has both team codes filled in.

select cron.schedule(
  'sync-knockout-bracket',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync-knockout-bracket',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);
