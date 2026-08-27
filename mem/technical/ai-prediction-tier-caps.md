---
name: AI Prediction Tier Caps
description: Hard caps per tier on AI Predictions page (Premium 10, Pro 10, Free 10) with overflow cascade
type: feature
---
`tierAssignment.ts` applies hard caps per tier after sorting by effective strength (best eligible market ≥65%), then league tier:
- PREMIUM_CAP = 10 (≥80%)
- PRO_CAP = 10 (65–79%, hard cap — no soft-cap exception)
- FREE_CAP = 10 — strongest overflow picks cascading down from Pro

Sort: strength DESC, then leagueTier ASC. Overflow cascades Premium → Pro → Free. Anything beyond all caps gets no tier and is filtered out.
