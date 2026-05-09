do $$ begin perform cron.unschedule('daily-generate-ai-tips'); exception when others then null; end $$;

select cron.schedule(
  'daily-generate-ai-tips',
  '30 8 * * *',
  $job$
  select net.http_post(
    url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/generate-ai-tips',
    headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA'),
    body := jsonb_build_object('source','cron')
  );
  $job$
);
