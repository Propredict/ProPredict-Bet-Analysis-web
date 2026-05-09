-- Add market_odds column to ai_predictions so snapshot-odds can store
-- per-match real bookmaker consensus for over_1_5/over_2_5/btts_yes/etc.
ALTER TABLE public.ai_predictions
  ADD COLUMN IF NOT EXISTS market_odds jsonb DEFAULT '{}'::jsonb;
