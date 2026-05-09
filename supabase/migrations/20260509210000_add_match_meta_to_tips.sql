ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS match_id text,
  ADD COLUMN IF NOT EXISTS match_time text,
  ADD COLUMN IF NOT EXISTS match_date date;

DROP VIEW IF EXISTS public.tips_public;
CREATE VIEW public.tips_public WITH (security_invoker=on) AS
SELECT
  id, home_team, away_team, league, odds, tier, status, result,
  tip_date, created_at_ts, updated_at, created_by, category,
  match_id, match_time, match_date,
  CASE
    WHEN tier IN ('free','daily') THEN prediction
    WHEN public.user_has_min_plan(
      CASE WHEN tier = 'exclusive' THEN 'basic' WHEN tier = 'premium' THEN 'premium' ELSE 'free' END
    ) THEN prediction
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid() AND u.content_type = 'tip' AND u.content_id = tips.id::text
    ) THEN prediction
    ELSE '🔒'
  END AS prediction,
  CASE
    WHEN tier IN ('free','daily') THEN confidence
    WHEN public.user_has_min_plan(
      CASE WHEN tier = 'exclusive' THEN 'basic' WHEN tier = 'premium' THEN 'premium' ELSE 'free' END
    ) THEN confidence
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid() AND u.content_type = 'tip' AND u.content_id = tips.id::text
    ) THEN confidence
    ELSE NULL
  END AS confidence,
  CASE
    WHEN tier IN ('free','daily') THEN ai_prediction
    WHEN public.user_has_min_plan(
      CASE WHEN tier = 'exclusive' THEN 'basic' WHEN tier = 'premium' THEN 'premium' ELSE 'free' END
    ) THEN ai_prediction
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid() AND u.content_type = 'tip' AND u.content_id = tips.id::text
    ) THEN ai_prediction
    ELSE NULL
  END AS ai_prediction
FROM public.tips
WHERE status = 'published';
