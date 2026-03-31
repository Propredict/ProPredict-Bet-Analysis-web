ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

DROP VIEW IF EXISTS public.tips_public;
CREATE VIEW public.tips_public WITH (security_invoker=on) AS
  SELECT id, home_team, away_team, league, prediction, odds, confidence,
         ai_prediction, tier, status, result, tip_date, created_at_ts,
         updated_at, created_by, category
  FROM public.tips
  WHERE status = 'published';

DROP VIEW IF EXISTS public.tickets_public;
CREATE VIEW public.tickets_public WITH (security_invoker=on) AS
  SELECT id, title, description, total_odds, tier, status, result,
         ticket_date, created_at_ts, updated_at, created_by, ai_analysis, category
  FROM public.tickets
  WHERE status = 'published';
