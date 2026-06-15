-- Switch staggered AI prediction cron from every 15 min to every 30 min.
-- Combined with DUE_WINDOW_MS = 3h30min in generate-due-predictions, this
-- guarantees each World Cup match is enriched in the 3h00min–3h30min window
-- before kickoff, then stays FROZEN.
DO $$
BEGIN
  PERFORM cron.unschedule('staggered-due-predictions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'staggered-due-predictions',
  '*/30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/generate-due-predictions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA'
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $cron$
);
