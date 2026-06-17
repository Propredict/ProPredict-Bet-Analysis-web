---
name: Prediction Markets Score Consistency
description: Predicted score, Over/Under 2.5, BTTS, and AI Insight text must be mutually consistent — no mismatches like 1-0 + Over 2.5 + BTTS Yes
type: feature
---
# Consistency rule for AI prediction outputs

Root cause observed (WC 17 Jun 2026, Argentina vs Algeria, Austria vs Jordan):
`predicted_score` was the **argmax of the Poisson matrix** (modal correct score, e.g. 1-0)
while `over_under` and `btts` were computed from **cumulative Poisson sums**
(P(total≥3), P(home≥1 AND away≥1)). With λ_home+λ_away ≈ 2.3-2.6 the modal score
lands at 1-0 but P(Over 2.5) > 50%, so the UI showed "1-0 + Over 2.5 + BTTS Yes" —
mathematically defensible, but reads as a contradiction. Additionally the
AI Insight text was a hardcoded template that said "leans Under 2.5" while the
card showed Over 2.5 → text didn't reflect chosen markets.

## Hard rules for `generate-ai-predictions` (apply to ALL future predictions)

After computing `predicted_score`, `over_under_pick`, `btts_pick`, and `analysis`,
run a consistency reconciliation pass BEFORE inserting into `ai_predictions`:

1. **Score ↔ Over/Under reconciliation**
   - Let `total = home_score + away_score` of `predicted_score`.
   - If `total <= 2` → force `over_under_pick = 'Under 2.5'`.
   - If `total >= 3` → force `over_under_pick = 'Over 2.5'`.
   - If `total == 2` AND Poisson P(Over 2.5) ≥ 0.58 → bump predicted_score to the
     most likely correct score whose `total >= 3` (re-argmax restricted to that subset).
     Otherwise keep Under 2.5.

2. **Score ↔ BTTS reconciliation**
   - If either side of `predicted_score` is 0 → force `btts_pick = 'No'`.
   - If both sides ≥ 1 AND Poisson P(BTTS Yes) ≥ 0.55 → force `btts_pick = 'Yes'`.
   - If `btts_pick = 'Yes'` but predicted_score has a 0 → re-argmax to nearest
     correct score where both teams score ≥ 1.

3. **AI Insight text MUST be generated from the FINAL reconciled markets**, never
   from a static template. Build the sentence by interpolating the actual chosen
   `over_under_pick`, `btts_pick`, confidence, and winner. No hardcoded
   "leans Under 2.5" / "BTTS No" strings.

4. The `predicted_score` ↔ winner direction must also hold:
   if `prediction = 'Home Win'` then home_score > away_score, etc. (already enforced;
   keep this guard intact when re-argmax-ing in steps 1-2).

**Do not** change historical rows. Apply only to predictions generated from now on.

File: `supabase/functions/generate-ai-predictions/index.ts` — search for
`predicted_score`/`over_under` assignment block; add reconciliation right before
the `analysis` string is built and before the upsert.
