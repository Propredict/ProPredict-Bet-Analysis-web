-- Staggered AI Predictions: per-match generation 3h before kickoff
ALTER TABLE public.ai_predictions
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_predictions_due_window
  ON public.ai_predictions (match_timestamp)
  WHERE analysis ILIKE 'Pending regeneration%' AND push_sent_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('staggered-due-predictions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'staggered-due-predictions',
  '*/15 * * * *',
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
