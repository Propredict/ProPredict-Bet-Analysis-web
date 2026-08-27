---
name: AI Prediction Tier Caps
description: Hard caps per tier on AI Predictions page (Premium 10, Pro 15, Free 5) with overflow cascade
type: feature
---
`tierAssignment.ts` applies hard caps per tier after sorting by effective strength (best eligible market ≥65%), then league tier:
- PREMIUM_CAP = 10 (≥80%)
- PRO_CAP = 15 (65–79%, soft cap: picks ≥75% never demoted)
- FREE_CAP = 5 — only the strongest overflow picks that cascade down from Pro

Sort: strength DESC, then leagueTier ASC. Overflow cascades Premium → Pro → Free. Anything beyond all caps gets no tier and is filtered out.

Why FREE_CAP=5: keep Free tier limited to the very safest overflow picks.
