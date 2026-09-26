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
- World Cup excluded from the main list

New rejection rule: the fixture is rejected only when the data-quality score is below 30 (roughly fewer than 3 real recent matches per team and no season stats). A fixture is never rejected just because H2H, xG, odds or injuries are missing.

## C. League priority

- **Tier 1:** England PL/Championship/L1/L2, Serie A/B, Bundesliga/2. BL, La Liga/Segunda, Ligue 1/2, Eredivisie, Primeira, Belgium, Scotland, Turkey, Greece, Austria, Switzerland top divisions, UCL/UEL/UECL, Nations League, World Cup and Euro qualifiers, Euro, Copa America, AFCON.
- **Tier 2:** other established professional leagues (e.g. Denmark, Norway, Sweden, Poland, Czech Republic, Croatia, Serbia, MLS, Brazil, Argentina, Mexico, Saudi Arabia, Japan J1, Korea K1), second tiers of Tier-2 nations, and domestic cups of Tier-1 nations.
- **Tier 3:** everything else, including women's, youth/U-leagues, reserve and amateur leagues, and lower divisions.
- Detection uses API-Football league IDs first, then name rules (`Women`, `W`, `U19/U21/U23`, `II`, `Reserves`, `Youth`) to force Tier 3.

## D. Daily fixture pool

```text
All fixtures today/tomorrow (not started)
 -> classify tier
 -> order: Tier 1, Tier 2, Tier 3 (by kickoff inside each tier)
 -> analyse in that order in batches (time budget per run)
 -> Tier 3 analysed only if Tier 1+2 qualified picks < daily capacity (30) plus a buffer
```

Batch size, cron schedule and the API call budget stay the same. Tier 3 simply waits at the back of the queue.

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

1. Build the complete qualified pool (confidence ≥ 65).
2. Rank score = confidence + tier bonus (Tier 1 +6, Tier 2 +2, Tier 3 0) + quality/20.
3. Premium: top by rank with confidence ≥ 85 and HIGH quality, up to 10.
4. Pro: the next 10.
5. Free: the next 10.
6. The rest stay stored but are not tier-published. Current caps are unchanged.

## J. Keeping lower leagues from displacing major fixtures

- Queue order means Tier 3 is analysed only after Tier 1 and 2.
- The rank bonus plus quality (Tier 3 has lower coverage points) means a Tier 3 match at 90% raw cannot beat a Tier 1 match at 82% unless its quality is also high.
- Women's, youth and reserve competitions are forced to Tier 3.
- A Premium safeguard: at most 2 Tier-3 picks in Premium when enough Tier 1/2 picks qualify.

## K. Testing

- **Deno unit tests** (`predictionEngine_test.ts`):
  - Grid sums to 1; markets are consistent (Over 2.5 ≤ Over 1.5, BTTS vs scores)
  - Liverpool–Arsenal-like input picks Over 2.5, not 1X2 or Over 1.5
  - Strong favourite input gives Home Win above 75%
  - Missing H2H/odds/xG still produces a prediction with lower quality
  - Very thin data is rejected
  - Tier ordering and allocation (a Tier 3 90% vs a Tier 1 82% case)
- **Live dry run:** a `dryRun: true` flag on the function returns the pool without writing, for today's fixtures. Checks: tier mix, spread of main markets (not all Over 1.5), no repeated 75/12/13, confidence distribution.
- **UI check** in the browser: AI Predictions, Top 10 and match analysis show the same pick and percentage.

## Technical notes

- Old rows keep their existing display (read-only fallback); this only applies to new generations.
- Engine version is stored (`engine_version = 'v7'`) for rollback and comparison.
- An optional later step: an LLM writes the explanation text from the stored numbers only.
