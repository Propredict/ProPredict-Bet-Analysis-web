---
name: AI Prediction Real xG Phase 1
description: Phase 1 minimal real xG integration — fixed 0.7/0.3 blend with proxy fallback, no extra logic
type: feature
---
# Phase 1 — Real xG Integration (minimal)

**Where:** `supabase/functions/generate-ai-predictions/index.ts` around the main loop where `homeXg`/`awayXg` are computed (search `[xG-PHASE1]`).

**Logic:**
1. Compute `proxyHomeXg`/`proxyAwayXg` as before (form-based).
2. Fetch real xG for both teams via `getCachedRealXG()` (uses `team_xg_cache`, 6h TTL).
3. If real xG exists for BOTH teams → blend with FIXED weight: `0.7 * real + 0.3 * proxy`. Set `xg_source = 'real'`.
4. Otherwise → use proxy only. Set `xg_source = 'proxy'`.
5. Resulting `homeXg`/`awayXg` feed `poissonGoalMarkets` and are saved to `last_home_goals`/`last_away_goals`.

**DB column:** `ai_predictions.xg_source TEXT` (`'real' | 'proxy'`). Migration: `20260501090226_add_xg_source_column.sql`.

**Explicitly NOT in Phase 1 (do NOT add without explicit user request):**
- Dynamic weights based on sample size
- Sanity guard for |real - proxy| anomalies
- BTTS / Over confidence boost from real xG
- Any other downstream re-tuning

**Logging:** `[xG-PHASE1]` log fires only when blend succeeds (source=real). Existing `logXGComparison` keeps using `proxyHomeXg/proxyAwayXg` so the analytics log preserves its original meaning.
