-- Phase 1: Real xG integration
-- Tracks which xG source was used for the prediction:
--   'real'  → blended 0.7 real_xG + 0.3 proxy_xG (real xG available from team_xg_cache)
--   'proxy' → fallback to proxy xG only (no real xG cached for one or both teams)
ALTER TABLE public.ai_predictions
  ADD COLUMN IF NOT EXISTS xg_source TEXT;

COMMENT ON COLUMN public.ai_predictions.xg_source IS
  'xG input source: real (blended 0.7 real + 0.3 proxy) or proxy (fallback only)';
