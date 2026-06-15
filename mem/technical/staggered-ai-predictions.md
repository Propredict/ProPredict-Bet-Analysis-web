---
name: Staggered AI Predictions
description: Per-match AI prediction generation 3h before kickoff via 15-min cron + push notification when ready
type: feature
---
AI predictions are generated **per-match, ~3h before kickoff**, never as a single morning batch.

**How it works:**
- Morning batch (`generate-ai-predictions`) inserts placeholder rows with `analysis = 'Pending regeneration...'` for all today/tomorrow fixtures.
- `[STAGGER]` guard in the per-fixture enrichment loop skips any match whose kickoff is > 3h15min away — they stay as placeholders.
- New `generate-due-predictions` edge function runs every 15 min (pg_cron job `staggered-due-predictions`). It selects placeholders whose `match_timestamp` is in `now-30min … now+3h15min`, enriches each one via single-fixture `generate-ai-predictions` call, then sends a batched "🔮 AI Pick Ready" push and stamps `push_sent_at`.
- Push throttling: 1 batched summary per cron tick (no per-match spam).
- UI: `PendingPickCard` (used inside `AIPredictionCard`) detects placeholder via `isPendingPlaceholder()` and shows "AI Pick Unlocks at HH:MM" countdown — no numbers exposed that could later change.
- Admins bypass PendingPickCard for debugging.

**Why:** eliminates "morning pick vs evening pick" drift. Each match generated exactly once, when lineups + odds give max accuracy.

**DB column:** `ai_predictions.push_sent_at TIMESTAMPTZ` — set once when AI Pick Ready push is sent; never re-notify.