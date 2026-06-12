-- Track when "WC prediction available" push was sent per prediction,
-- so we never notify twice for the same match.
ALTER TABLE public.ai_predictions
  ADD COLUMN IF NOT EXISTS wc_pred_notified_at timestamptz;

-- Hourly cron: notify users for WC matches kicking off in the next ~6 hours
-- whose AI prediction has been generated and not yet announced.
do $$ begin perform cron.unschedule('wc-prediction-available-push'); exception when others then null; end $$;

select cron.schedule(
  'wc-prediction-available-push',
  '0 * * * *',
  $job$
  select net.http_post(
    url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/send-wc-prediction-available',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA'
    ),
    body := jsonb_build_object('source','cron-hourly')
  );
  $job$
);
