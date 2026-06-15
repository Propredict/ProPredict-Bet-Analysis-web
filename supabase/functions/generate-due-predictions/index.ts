/**
 * generate-due-predictions
 *
 * Per-match staggered AI prediction enrichment.
 * Runs every 15 minutes via pg_cron. Selects placeholder predictions
 * whose kickoff is within the next ~3h window (or already started but
 * still placeholder — safety net) and enriches them ONE BY ONE by
 * calling the existing generate-ai-predictions function in single-fixture
 * mode. Each successfully enriched match gets a "AI Pick Ready" push.
 *
 * Key guarantees:
 *  - A prediction is enriched ONLY when kickoff is <= 3h15min away.
 *  - After enrichment, push_sent_at is stamped so we know when it became ready.
 *  - Placeholder rows (analysis ILIKE 'Pending regeneration%') are the
 *    only candidates; enriched rows are NEVER touched.
 *  - WC push is sent only for the exact prediction IDs enriched in this run.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Window: enrich matches starting in <= 3h30min from now. Combined with a
// 30-min cron cadence this guarantees every WC match is generated in the
// 3h00min–3h30min window before kickoff — as close to kickoff as possible
// while still being shown to users ~3h ahead. Once written, the prediction
// is FROZEN (placeholder rows are the only candidates; enriched rows are
// never touched again).
const DUE_WINDOW_MS = 3 * 60 * 60 * 1000 + 30 * 60 * 1000; // 3h30min
// Don't bother enriching matches that have been live/finished for > 30 min
// (the result update job will mark them, and lineup data is stale anyway).
const STALE_PAST_MS = 30 * 60 * 1000;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + DUE_WINDOW_MS);
    const windowStart = new Date(now.getTime() - STALE_PAST_MS);

    // Find WORLD CUP placeholder predictions whose kickoff is within the due window.
    // Staggered enrichment applies ONLY to World Cup matches — other leagues
    // are generated normally at batch time.
    const { data: candidates, error: queryErr } = await supabase
      .from("ai_predictions")
      .select("id, match_id, home_team, away_team, league, match_timestamp, match_date, match_time, push_sent_at, analysis")
      .ilike("analysis", "Pending regeneration%")
      .ilike("league", "%World Cup%")
      .not("match_timestamp", "is", null)
      .gte("match_timestamp", windowStart.toISOString())
      .lte("match_timestamp", windowEnd.toISOString())
      .order("match_timestamp", { ascending: true })
      .limit(20);

    if (queryErr) {
      console.error("[due-preds] query error:", queryErr.message);
      return new Response(JSON.stringify({ ok: false, error: queryErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "no due predictions", window: { start: windowStart, end: windowEnd } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[due-preds] Found ${candidates.length} placeholder(s) due for enrichment`);

    const enriched: Array<{ home: string; away: string; id: string; match_id: string }> = [];
    const failed: Array<{ match_id: string; error: string }> = [];

    for (const row of candidates) {
      try {
        // Call generate-ai-predictions in single-fixture mode — returns
        // a fully calculated prediction object (Poisson + xG + form + odds).
        const genRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-ai-predictions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ fixtureId: row.match_id }),
        });

        if (!genRes.ok) {
          const txt = await genRes.text();
          failed.push({ match_id: row.match_id, error: `gen HTTP ${genRes.status}: ${txt.slice(0, 200)}` });
          continue;
        }

        const pred = await genRes.json();
        if (!pred || pred.error || !pred.prediction) {
          failed.push({ match_id: row.match_id, error: pred?.error || "no prediction returned" });
          continue;
        }

        // Write enrichment back to the placeholder row.
        const { error: updErr } = await supabase
          .from("ai_predictions")
          .update({
            prediction: pred.prediction,
            predicted_score: pred.predicted_score,
            confidence: pred.confidence,
            home_win: pred.home_win,
            draw: pred.draw,
            away_win: pred.away_win,
            risk_level: pred.risk_level,
            analysis: pred.analysis,
            key_factors: pred.key_factors ?? null,
            xg_home: pred.xg_home ?? null,
            xg_away: pred.xg_away ?? null,
            last_home_goals: pred.last_home_goals ?? null,
            last_away_goals: pred.last_away_goals ?? null,
            injury_impact_home: pred.injury_impact_home ?? null,
            injury_impact_away: pred.injury_impact_away ?? null,
            is_locked: false,
            push_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updErr) {
          failed.push({ match_id: row.match_id, error: `update: ${updErr.message}` });
          continue;
        }

        enriched.push({
          home: row.home_team ?? "Home",
          away: row.away_team ?? "Away",
          id: row.id,
          match_id: row.match_id,
        });
      } catch (e) {
        failed.push({ match_id: row.match_id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Send WC push ONLY for the exact predictions enriched in this run.
    // This prevents the notifier from announcing a later match just because
    // it was already ready and still inside a broad kickoff lookahead window.
    if (enriched.length > 0) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-wc-prediction-available`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            source: "generate-due-predictions",
            prediction_ids: enriched.map((m) => m.id),
          }),
        });
      } catch (e) {
        console.warn("[due-preds] wc push send failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        enriched_count: enriched.length,
        failed_count: failed.length,
        enriched: enriched.map((e) => `${e.home} vs ${e.away}`),
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[due-preds] fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});