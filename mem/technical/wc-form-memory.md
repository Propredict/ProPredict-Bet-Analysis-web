---
name: WC Form Memory (Round 2+)
description: For World Cup 2026 fixtures (league_id=1), the AI engine prepends the team's prior WC matches to the recent form array so the recency-weighted model treats them as the strongest signal. Falls back to general form for Round 1.
type: feature
---
- Helper `mergeWorldCupMemory(teamId, baseForm, apiKey)` in `generate-ai-predictions/index.ts`.
- Calls `fetchTeamForm(teamId, apiKey, 10, leagueId=1)` to get WC-only fixtures, dedupes by `matchDate|opponentId`, prepends them to general form, caps at 10.
- Applied at 3 enrichment points: main batch loop, `wcRegenerateNow` path, and single-fixture mode — all gated on `leagueId === 1`.
- Round 1 (no WC history) → baseForm unchanged. Round 2+ → WC results dominate the form signal automatically.
