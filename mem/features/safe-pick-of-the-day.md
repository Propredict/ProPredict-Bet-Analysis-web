---
name: Safe Pick of the Day — Strict Rules
description: Safe Pick must be genuinely safe; no fallback below 85% confidence
type: feature
---
**Hard rules** (all must pass — no fallback ladder, no relaxation):
- confidence ≥ **85%** (strict floor, never lower)
- Low-risk market OR strong main 1X2 (still ≥ 85%)
- xG total ≥ 2.2 when xG data present
- variance MUST be STABLE
- Must NOT be the same match as Diamond Pick

If no match qualifies → section is hidden. Better empty than misleading.

File: `src/pages/AIPredictions.tsx` → `safePicks` useMemo.
