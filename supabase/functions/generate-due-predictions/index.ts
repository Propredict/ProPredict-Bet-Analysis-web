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
 *  - After enrichment, push_sent_at is stamped so we never re-notify.
 *  - Placeholder rows (analysis ILIKE 'Pending regeneration%') are the
 *    only candidates; enriched rows are NEVER touched.
 *  - Push notification is sent as a single batched "summary" when 1+
 *    new predictions become ready in the same run.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Window: enrich matches starting in <= 3h15min from now (or already past kickoff
// but still placeholder — late-arriving safety net). Don't grab matches further
// out — we want generation as close to kickoff as possible for max accuracy.
const DUE_WINDOW_MS = 3 * 60 * 60 * 1000 + 15 * 60 * 1000; // 3h15min
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

    // Find placeholder predictions whose kickoff is within the due window.
    // analysis ILIKE 'Pending regeneration%' is the canonical placeholder marker.
    const { data: candidates, error: queryErr } = await supabase
      .from("ai_predictions")
      .select("id, match_id, home_team, away_team, league, match_timestamp, match_date, match_time, push_sent_at, analysis")
      .ilike("analysis", "Pending regeneration%")
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

    // Send a single batched push if any predictions became ready.
    if (enriched.length > 0) {
      let title: string;
      let body: string;
      if (enriched.length === 1) {
        const m = enriched[0];
        title = `🔮 ${m.home} vs ${m.away} — AI Pick Ready`;
        body = `Our AI analysis is live. Tap to see the prediction.`;
      } else {
        title = `🔮 ${enriched.length} New AI Picks Ready`;
        const preview = enriched.slice(0, 3).map((m) => `${m.home} vs ${m.away}`).join(", ");
        body = enriched.length > 3
          ? `${preview} +${enriched.length - 3} more — tap to view all`
          : `${preview} — tap to view all`;
      }

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            type: "summary",
            summary: {
              title,
              body,
              collapse_id: `ai_pick_ready_${Date.now()}`,
              nav_path: "/ai-predictions",
            },
          }),
        });
      } catch (e) {
        console.warn("[due-preds] push send failed:", e);
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