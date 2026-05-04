---
name: AI Prediction Tier Caps
description: Hard caps per tier on AI Predictions page (Free 50, Pro 20, Premium 10) with overflow drop and relaxed fallback
type: feature
---
AIPredictions.tsx applies hard caps per tier after sorting by effective strength:
- PREMIUM_CAP = 10 (≥78% confidence)
- PRO_CAP = 20 (65–77%)
- FREE_CAP = 50 (<65%, with smart fallback)

Overflow cascades down (Premium → Pro → Free). Anything beyond all caps gets `null` tier and is hidden.

**Smart Fallback (Free tier safety net):**
- MIN_FREE = 3. If Free has fewer than 3 picks after classification, fallback fills up to 3 from the **40–64% band** (relaxed from 58–64%), sorted strongest-first, requires `variance_stable !== false`.
- Secondary fallback: if Free is still 0, borrow the weakest Pro picks (1–3 matches).

Why the 40% floor: on slow data days (few matches passed quality gate), the 58% threshold left Free completely empty. Lowering to 40% guarantees users always see at least 3 Free picks while variance_stable filter prevents promoting noisy predictions.
