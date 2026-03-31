-- Add category column to tips table
ALTER TABLE public.tips
ADD COLUMN IF NOT EXISTS category text DEFAULT 'standard';

-- Add category column to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS category text DEFAULT 'standard';

-- Update the tips_public view to include category
CREATE OR REPLACE VIEW public.tips_public AS
SELECT
  id,
  home_team,
  away_team,
  league,
  odds,
  tier,
  status,
  result,
  tip_date,
  created_at_ts,
  updated_at,
  created_by,
  category,
  CASE
    WHEN tier = 'free' OR tier = 'daily' THEN prediction
    WHEN public.user_has_min_plan(
      CASE
        WHEN tier = 'exclusive' THEN 'basic'
        WHEN tier = 'premium' THEN 'premium'
        ELSE 'free'
      END
    ) THEN prediction
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid()
        AND u.content_type = 'tip'
        AND u.content_id = tips.id::text
    ) THEN prediction
    ELSE '🔒'
  END AS prediction,
  CASE
    WHEN tier = 'free' OR tier = 'daily' THEN confidence
    WHEN public.user_has_min_plan(
      CASE
        WHEN tier = 'exclusive' THEN 'basic'
        WHEN tier = 'premium' THEN 'premium'
        ELSE 'free'
      END
    ) THEN confidence
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid()
        AND u.content_type = 'tip'
        AND u.content_id = tips.id::text
    ) THEN confidence
    ELSE NULL
  END AS confidence,
  CASE
    WHEN tier = 'free' OR tier = 'daily' THEN ai_prediction
    WHEN public.user_has_min_plan(
      CASE
        WHEN tier = 'exclusive' THEN 'basic'
        WHEN tier = 'premium' THEN 'premium'
        ELSE 'free'
      END
    ) THEN ai_prediction
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid()
        AND u.content_type = 'tip'
        AND u.content_id = tips.id::text
    ) THEN ai_prediction
    ELSE NULL
  END AS ai_prediction
FROM public.tips
WHERE status = 'published';

-- Update the tickets_public view to include category
CREATE OR REPLACE VIEW public.tickets_public AS
SELECT
  id,
  title,
  total_odds,
  tier,
  status,
  result,
  description,
  ticket_date,
  created_at_ts,
  updated_at,
  created_by,
  category,
  CASE
    WHEN tier = 'free' OR tier = 'daily' THEN ai_analysis
    WHEN public.user_has_min_plan(
      CASE
        WHEN tier = 'exclusive' THEN 'basic'
        WHEN tier = 'premium' THEN 'premium'
        ELSE 'free'
      END
    ) THEN ai_analysis
    WHEN EXISTS (
      SELECT 1 FROM public.user_unlocks u
      WHERE u.user_id = auth.uid()
        AND u.content_type = 'ticket'
        AND u.content_id = tickets.id::text
    ) THEN ai_analysis
    ELSE NULL
  END AS ai_analysis
FROM public.tickets
WHERE status = 'published';
