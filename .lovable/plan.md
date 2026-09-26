# Revised Plan: One Market-Based Prediction Engine

Goal: for each fixture, find the market with the strongest statistical support, publish only 65%+ picks, and fill Premium, then Pro, then Free, with major leagues first. The numbers come only from statistics, never from an LLM.

## A. Files that change

| File | Change |
|---|---|
| `supabase/functions/generate-ai-predictions/predictionEngine.ts` (new) | One engine: expected goals, all market probabilities, data quality, confidence, main-pick selection |
| `supabase/functions/generate-ai-predictions/leaguePriority.ts` (new) | Tier 1/2/3 classification (league IDs plus name matching, women/youth/reserve detection) |
| `supabase/functions/generate-ai-predictions/index.ts` | Builds the fixture pool, calls the engine, allocates tiers. Removes `decideStep2`/`decideStep2Soft`, the 1X2 caps, the fake defaults and the v4 confidence formula |
| `supabase/functions/generate-ai-predictions/tierAssignment` logic | Keeps current caps (Premium 10 / Pro 10 / Free 10); ranking uses the new rank score |
| `src/components/ai-predictions/utils/marketDerivation.ts` | Stops recalculating. Reads the stored engine result (main market, probability, confidence, market table). Keeps the old calculation only for old rows |
| `src/hooks/useAIPredictions.ts` | Filter becomes `confidence >= 65 && has stored engine result` (no longer requires xG) |
| `src/utils/matchPreviewPicks.ts`, `topPicksRanking.ts` | Use the stored main market and confidence; ordering follows league tier, then rank score |
| DB migration | New columns on `ai_predictions`: `market_probs jsonb`, `main_market text`, `main_probability int`, `data_quality int`, `data_quality_label text`, `league_tier int`, `engine_version text` |

Existing UI layout, payments, tickets and plan types stay untouched.

## B. Filtering rules removed or changed

Removed:
- 1X2 caps (home 10–75, draw 12–28, away floor 10)
- Fake defaults (1.0 / 1.3 goals, neutral 50/25/25 odds)
- Fixed-rule main pick (`decideStep2` and its soft version)
- Website requirement that xG exists for both teams
- Premium gate requiring 2+ bookmakers; Pro/Free gate requiring 1 bookmaker (odds now only raise quality)
- Hard "5 matches (8 for lower leagues)" rule, replaced by the data-quality score

Kept:
- Live/finished fixtures skipped; World Cup 3h freeze
- Missing team IDs → skip
- Final confidence below 65 → not published
- Dedupe by match
- World Cup handling (existing product rule, unchanged): World Cup fixtures **are analysed by the new engine** as Tier 1 and get full v7 results. They're shown on the dedicated World Cup AI Picks page (existing portal, with its own rules such as the 3h freeze and the 70% confidence floor), and only kept out of the main club AI Predictions list, Top 10 and the club Premium/Pro/Free caps, exactly as today. No valid World Cup fixture is dropped from analysis.

New rejection rule: the fixture is rejected only when the data-quality score is below 30 (roughly fewer than 3 real recent matches per team and no season stats). A fixture is never rejected just because H2H, xG, odds or injuries are missing.

## C. League priority

- **Tier 1:** England PL/Championship/L1/L2, Serie A/B, Bundesliga/2. BL, La Liga/Segunda, Ligue 1/2, Eredivisie, Primeira, Belgium, Scotland, Turkey, Greece, Austria, Switzerland top divisions, UCL/UEL/UECL, Nations League, World Cup and Euro qualifiers, Euro, Copa America, AFCON.
- **Tier 2:** other established professional leagues (e.g. Denmark, Norway, Sweden, Poland, Czech Republic, Croatia, Serbia, MLS, Brazil, Argentina, Mexico, Saudi Arabia, Japan J1, Korea K1), second tiers of Tier-2 nations, and domestic cups of Tier-1 nations.
- **Tier 3:** everything else, including women's, youth/U-leagues, reserve and amateur leagues, and lower divisions.
- Detection uses API-Football league IDs first, then name rules (`Women`, `W`, `U19/U21/U23`, `II`, `Reserves`, `Youth`) to force Tier 3.

## D. Daily fixture pool (strict tier queue)

```text
All fixtures today/tomorrow (not started)
 -> classify tier
 -> Stage 1: analyse ALL Tier 1 fixtures (across as many batches/runs as needed)
 -> Stage 2: Tier 2, only if qualified picks < capacity (30) + buffer (10)
 -> Stage 3: Tier 3, only if still short after Tier 2 is fully processed
```

- The batch loop always takes the next batch from the lowest unfinished tier. A Tier 2/3 fixture is never picked while any Tier 1 fixture is still pending (not yet analysed and not rejected).
- The stage state is kept per date, so a run that times out resumes at the same tier. Tier 3 can never jump ahead because of batch size.
- Tier allocation (section I) runs only after the current stage is finished, so nothing is published from a partial pool.
- Batch size, cron schedule and the API call budget stay the same.

## E. One engine for all markets

1. **Team strength.** Attack and defence ratings from real data, weighted by availability:
   - season home/away goals for/against (weight 0.5)
   - last-10 form goals (0.3)
   - H2H goals (0.1, only if 3+ meetings)
   - league average used as a shrinkage prior
2. **Expected goals.** λ_home = league_home_avg × home_attack × away_defence, and likewise λ_away. Ratings are shrunk toward 1.0 in proportion to the missing sample (Bayesian shrinkage), so thin data pulls toward the league average instead of inventing strength.
3. **Odds blend (when present).** Implied 1X2 and Over/Under 2.5 probabilities are used to calibrate λ (weight grows with bookmaker count, max 35%).
4. **Adjustments.** Injuries (existing `injuryImpact.ts`) reduce λ within ±10%.
5. **Market probabilities.** A Dixon–Coles corrected Poisson grid (0–8 goals) gives 1, X, 2, Over/Under 1.5/2.5/3.5, BTTS Yes/No and correct score. All markets come from the same grid, so they are mutually consistent. No caps.

## F. Main prediction selection

For each market with probability ≥ 65:
- `edge = (p - base_rate) / (1 - base_rate)`, using fixed base rates (Over 1.5 ≈ 0.75, Over 2.5 ≈ 0.52, Over 3.5 ≈ 0.28, BTTS Yes ≈ 0.52, home ≈ 0.45, draw ≈ 0.26, away ≈ 0.29, and matching values for the other markets)
- `market_score = 0.6·p + 0.4·edge·100`

The highest market score becomes the main pick. Over 1.5 wins only when it is truly dominant: Over 1.5 at 90% scores lower than Over 2.5 at 78%. Correct score is only eligible when data quality is at least 75 and its probability is at least 65 (rare, by design). The predicted score shown is the most likely score consistent with the chosen market (existing reconciliation rule).

## G. Probability vs final confidence

- **Model probability:** raw p of the chosen market.
- **Data quality (0–100):** season stats per team (25), last-10 form sample size (25), home/away split (10), odds with bookmaker count (20), H2H (5), injuries/lineups (5), league tier coverage (10: Tier 1 = 10, Tier 2 = 6, Tier 3 = 2).
- **Final confidence:** `confidence = 50 + (p - 50) × reliability`, where reliability = 0.55 + 0.45 × quality/100.
  - p 87, quality 95 → ≈ 85
  - p 87, quality 40 → ≈ 77
  - p 87, quality 20 → ≈ 74
- **Labels:** quality ≥ 75 HIGH, 50–74 MEDIUM, < 50 LIMITED.
- **Premium** requires confidence ≥ 85 **and** quality HIGH.

## H. Missing data

Each missing source removes its points from the quality score and its weight from the strength blend. The remaining sources are renormalised, with shrinkage toward the league average. No fixed goal defaults. Below quality 30 the fixture is rejected, and it's logged as `skipped_reason`. The text analysis only mentions sources that were actually used ("H2H not available" when missing).

## I. Premium / Pro / Free

1. Build the complete qualified pool (final confidence ≥ 65).
2. Rank by, in order:
   1. Final confidence
   2. Data quality
   3. League tier
   
   League tier is a small tie-breaker only: rank score = confidence + quality/25 + tier bonus (Tier 1 +1.5, Tier 2 +0.5, Tier 3 0). The most the league can add is about 1.5 points, so a clearly stronger, well-supported Tier 2 pick (e.g. 84 vs 80) always beats a weaker Tier 1 pick. Close cases (within about 1–2 points) go to the major league.
3. **Premium:** confidence ≥ 85 **and** HIGH data quality (≥ 75), no exceptions, up to 10. A 90% raw probability with limited data can never be Premium, because confidence is lowered and the quality check fails.
4. **Pro:** confidence ≥ 65 **and** quality at least MEDIUM (≥ 50), next 10 by rank.
5. **Free:** confidence ≥ 65 **and** quality at least MEDIUM (≥ 50), next 10 by rank. MEDIUM/HIGH picks always fill Free first.
6. **LIMITED quality (< 50)** is stored and logged (visible in the dry-run report) but **not published** in Premium, Pro or Free, however high the probability. If there aren't enough qualified picks, the system expands to the next league tier (D) looking for MEDIUM/HIGH picks, rather than publishing LIMITED ones. A Free slot may stay empty instead of being filled with limited data.
7. The rest stay stored but are not tier-published. Current caps are unchanged.

## J. Keeping lower leagues from displacing major fixtures

- The strict tier queue (D) means Tier 3 is only analysed after every Tier 1 and Tier 2 fixture is done, and only if capacity is still short.
- Tier 3 gets fewer coverage points in data quality, so it rarely reaches HIGH quality, and therefore rarely reaches Premium.
- Women's, youth and reserve competitions are forced to Tier 3.
- A Premium safeguard: at most 2 Tier-3 picks in Premium when enough Tier 1/2 picks qualify.

## K. Testing

- **Deno unit tests** (`predictionEngine_test.ts`):
  - Grid sums to 1; markets are consistent (Over 2.5 ≤ Over 1.5, BTTS vs scores)
  - Synthetic, unnamed "Team A vs Team B" input (balanced sides, both high-scoring and conceding, so 1X2 is flat and Over 2.5 has the highest market score): the engine must select Over 2.5, not 1X2 or Over 1.5. It checks the logic only; no real team has a preset outcome
  - Further synthetic sets where the data clearly favours Home Win, Under 2.5 and BTTS No, each checking the expected market
  - Strong favourite input gives Home Win above 75%
  - Missing H2H/odds/xG still produces a prediction with lower quality
  - Very thin data is rejected
  - Strict tier queue: no Tier 3 analysed while Tier 1 is pending
  - Ranking: a strong Tier 2 pick beats a weak Tier 1 pick; a 90% pick with limited data is not Premium
- **Dry run before any production write.** A `dryRun: true` flag runs the whole pipeline without writing and returns a report:
  - Tier 1 fixtures found vs analysed
  - Number qualified at ≥ 65%
  - Premium / Pro / Free candidates
  - Rejected fixtures with reasons
  - Tier distribution and main-market distribution (including the Over 1.5 share)
  - Count of 75/12/13 patterns (should be 0)
  - Important leagues with fixtures but no qualified pick
  
  I'll share this report with you. The new generation is not switched on in production until you approve it.
- **UI check** in the browser: cards, tabs, Top 10 and match analysis show identical numbers.

## L. Existing card UI unchanged, one source of truth

- No redesign: the MAIN / GOALS / BTTS / COMBO / CORRECT tabs and card layouts stay exactly as they are. Only the data they read changes.
- The engine stores one result per fixture (`market_probs`, `main_market`, `main_probability`, confidence, quality). Every place reads it:
  - AI Prediction cards and the main prediction at the top: main market plus final confidence
  - MAIN tab: 1X2 analysis from the same grid
  - GOALS tab: Over/Under from the grid
  - BTTS tab: BTTS Yes/No from the grid
  - COMBO tab: combos (e.g. BTTS & Over 2.5, 1 & Over 1.5) computed from the same grid and stored with it
  - CORRECT tab: top correct scores from the grid
  - Top AI Picks and match analysis/details: the same stored result
- The frontend no longer recalculates for v7 rows, so a card can never show "86% confidence" on top of a different market's 74%. The number shown next to the main pick is always that market's final confidence, and the probability is shown from the same stored result.

## Technical notes

- Old rows keep their existing display (read-only fallback); only new generations use `engine_version = 'v7'`.
- Engine version is stored for rollback and comparison.
- An optional later step: an LLM writes the explanation text from the stored numbers only.
