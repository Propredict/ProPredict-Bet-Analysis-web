- [x] Objediniti Daily Predictions, Premium Predictions, Risk of the Day i Diamond Pick u Single Tips stranicu bez promene pravila
- [x] Sabiti Daily i Premium tiket u pregledan mobilni ticket-listić bez promene unlock pravila
- [x] AI prediction engine v7: engine + league priority + tests + dry-run function
- [ ] v7: decide Tier 3 allocation rule after dry-run review (waiting on user)
- [ ] v7: DB columns + UI wiring to stored v7 result + switch production generation (waiting on user approval of dry run)

## Engine v7 activation (waiting on DB access)
- [ ] Apply `propredict-v7-activation.sql` — user runs it in Supabase SQL Editor (DB tools blocked by approval preference; user does not want to enable Lovable Cloud)
- [ ] Deploy edge functions (ai-engine-v7, generate-predictions-v7) + verify 16/16 deno tests
- [ ] Update frontend helpers (marketDerivation, tierAssignment, useAIPredictions) to read stored v7 fields — no visual changes
- [ ] Generate next production prediction set and deliver full report
