ALTER TABLE public.ai_predictions
  ADD COLUMN IF NOT EXISTS market_odds jsonb DEFAULT '{}'::jsonb;
