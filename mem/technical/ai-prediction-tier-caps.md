---
name: AI Prediction Tier Caps
description: Hard caps per tier on AI Predictions page (Free 50, Pro 20, Premium 10) with overflow drop
type: feature
---
AIPredictions.tsx applies hard caps per tier after sorting by effective strength, then league tier:
- PREMIUM_CAP = 10 (≥78% confidence)
- PRO_CAP = 20 (65–77%)
- FREE_CAP = 20 (<65%, smart fallback if empty)

Sort: strength DESC, then leagueTier ASC (Tier 1 → 2 → 3). Overflow cascades down (Premium → Pro → Free) so Free fills first with Pro overflow (safest), then top-league native Free picks, then the rest. Anything beyond all caps gets `null` tier from `getPredictionTier` and is filtered OUT of `filteredPredictions`. Total visible per day capped at 50.

Why FREE_CAP=20: keep Free tier curated to the highest-quality picks instead of 50 mid-tier matches.
