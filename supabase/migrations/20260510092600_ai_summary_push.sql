-- Skip per-row push notifications for AI-generated tips/tickets.
-- A single daily summary push is sent by the generator functions instead.
-- Admin-published content (category='standard' or NULL) still triggers normal pushes.

CREATE OR REPLACE FUNCTION public.notify_tip_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published')
     AND COALESCE(NEW.category, '') NOT IN ('ai_daily','ai_pro','ai_premium','risk_of_day','diamond_pick','multi_risk') THEN
    PERFORM net.http_post(
      url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA'
      ),
      body := jsonb_build_object(
        'type', 'tip',
        'record', jsonb_build_object(
          'id',        NEW.id,
          'status',    NEW.status,
          'tier',      NEW.tier,
          'category',  NEW.category,
          'home_team', NEW.home_team,
          'away_team', NEW.away_team,
          'league',    NEW.league,
          'prediction', NEW.prediction
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_ticket_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published')
     AND COALESCE(NEW.category, '') NOT IN ('ai_daily','ai_pro','ai_premium','risk_of_day','diamond_pick','multi_risk') THEN
    PERFORM net.http_post(
      url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA'
      ),
      body := jsonb_build_object(
        'type', 'ticket',
        'record', jsonb_build_object(
          'id',     NEW.id,
          'status', NEW.status,
          'tier',   NEW.tier,
          'category', NEW.category,
          'title',  NEW.title
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
