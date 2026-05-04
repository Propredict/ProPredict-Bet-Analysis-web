---
name: AI Prediction Tier Caps
description: Hard caps per tier on AI Predictions page (Free 50, Pro 20, Premium 10) with overflow drop
type: feature
---
AIPredictions.tsx applies hard caps per tier after sorting by effective strength:
- PREMIUM_CAP = 10 (≥78% confidence)
- PRO_CAP = 20 (65–77%)
- FREE_CAP = 50 (<65%, smart fallback if empty)

Overflow cascades down (Premium → Pro → Free). Anything beyond all caps gets `null` tier from `getPredictionTier` and is filtered OUT of `filteredPredictions` so it never renders. Total visible per day capped at 80.

Why: Originally Free showed 300+ matches because `getPredictionTier` defaulted overflow to "free". Now it returns null and is hidden — only the strongest 50 Free picks show.
