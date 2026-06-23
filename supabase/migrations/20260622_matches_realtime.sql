-- Enable Supabase Realtime UPDATE events on the matches table so an open
-- match-detail screen receives live score/minute/status changes pushed by the
-- sync-live-matches Edge Function (which writes to this table every minute).
--
-- matches is public-read (RLS), so the publishable-key client can subscribe.
-- Idempotent: skip if the table is already in the realtime publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
