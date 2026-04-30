---
name: AI Top Picks Selection (Top 5)
description: Cascading selection rules for the "Top AI Picks Today" section
type: feature
---
**Hard floor:** confidence ≥ 75% (never lower). All picks must pass quality gate (xG + form, no fallback analysis).

**Cascading priority** (fills up to 5, stops when full):
1. Tier 1 league + conf ≥ 85
2. Tier 1 league + conf 75–84
3. Tier 2 league + conf ≥ 85
4. Tier 2 league + conf 75–84
5. Other league + conf ≥ 85
6. Other league + conf 75–84

Tier 1 = Champions League, Europa, Conference, Premier League, La Liga, Bundesliga, Serie A, Ligue 1, World Cup, Euro, Copa America/Libertadores.
Tier 2 = Primeira Liga, Eredivisie, Süper Lig, Jupiler, Scottish Prem, Championship, La Liga 2, 2. Bundesliga, Serie B, Ligue 2, MLS, Brasileirão, Liga MX.
Youth/reserve leagues (U17–U23, "reserve", "youth") forced to Tier 3.

Diversity cap: max 2 of same bet type. **No force-fill below 75% — show fewer cards if pool is small.**

File: `src/components/ai-predictions/utils/topPicksRanking.ts` → `selectTopPicks`.
