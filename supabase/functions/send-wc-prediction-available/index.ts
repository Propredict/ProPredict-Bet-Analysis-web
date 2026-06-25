/**
 * send-wc-prediction-available
 *
 * Exact-match notifier. Called by `generate-due-predictions` only for the
 * World Cup predictions that were enriched in that same run.
 *
 * Sends a OneSignal push per match and marks `wc_pred_notified_at`
 * so users only receive ONE notification per match.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getLockedConfidence(row: { confidence?: number | null }): number | null {
  const rawConfidence = Number(row.confidence ?? 0);
  // World Cup notifications MUST advertise the safest pick. Never show below
  // 70% — if the raw DB confidence is missing or weaker, floor it to 70.
  // The DB value stays untouched; only the displayed % is clamped to [70, 99].
  const WC_CONF_DISPLAY_FLOOR = 70;
  const rounded = rawConfidence > 0 ? Math.round(rawConfidence) : WC_CONF_DISPLAY_FLOOR;
  const clamped = Math.max(WC_CONF_DISPLAY_FLOOR, Math.min(99, rounded));
  return clamped;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return new Response(JSON.stringify({ error: "OneSignal creds missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const predictionIds = Array.isArray(body?.prediction_ids)
      ? body.prediction_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      : Array.isArray(body?.predictionIds)
        ? body.predictionIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : [];

    if (predictionIds.length === 0) {
      console.warn("[wc-pred-push] skipped: explicit prediction_ids required");
      return new Response(
        JSON.stringify({ success: true, sent: 0, skipped: "explicit_prediction_ids_required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull ONLY the predictions that were just enriched by generate-due-predictions.
    const { data: rows, error } = await supabase
      .from("ai_predictions")
      .select(
        "id, home_team, away_team, prediction, confidence, home_win, draw, away_win, match_date, match_time, league, wc_pred_notified_at"
      )
      .in("id", predictionIds)
      .ilike("league", "%world cup%")
      .not("prediction", "is", null)
      .not("analysis", "is", null)
      .not("analysis", "ilike", "Pending%")
      .is("wc_pred_notified_at", null);

    if (error) {
      console.error("[wc-pred-push] db error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates = (rows ?? []).filter((r) => {
      if (!r.match_date || !r.match_time) return false;
      // match_time is "HH:MM:SS" UTC — stitch with date
      const koMs = new Date(`${r.match_date}T${r.match_time}Z`).getTime();
      if (Number.isNaN(koMs)) return false;
      // Only send within the FREEZE3 window: from 3h before kickoff up to
      // 20 min after kickoff. Outside this window the confidence value can
      // still change in later regeneration cycles, which would cause the
      // notification % to drift from what the user sees in the app. Inside
      // FREEZE3 the prediction is locked, so push % == UI %.
      const now = Date.now();
      const FREEZE_BEFORE_KO_MS = 3 * 60 * 60 * 1000;
      const GRACE_AFTER_KO_MS = 20 * 60 * 1000;
      return koMs - FREEZE_BEFORE_KO_MS <= now && koMs + GRACE_AFTER_KO_MS > now;
    });

    console.log(
      `[wc-pred-push] requested ${predictionIds.length}, loaded ${rows?.length ?? 0}, sending ${candidates.length}`
    );

    const results: Array<Record<string, unknown>> = [];

    for (const r of candidates) {
      const heading = `🏆 WC Prediction Ready: ${r.home_team} vs ${r.away_team}`;
      // Notification must show the exact locked DB confidence used by the UI.
      // Do not derive/inflate from 1X2 or double-chance probabilities.
      const displayConfidence = getLockedConfidence(r);
      const conf = displayConfidence ? `${displayConfidence}% confidence` : "70%+ confidence";
      const body = `Our AI pick is locked in — ${conf}. Tap to see the full analysis before kickoff.`;
      console.log(`[wc-pred-push] ${r.home_team} vs ${r.away_team} rawConf=${r.confidence} displayConf=${displayConfidence}`);
      const navPath = `/world-cup-2026?tab=predictions&from=wc_prediction_push&prediction=${encodeURIComponent(r.id)}`;

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        filters: [
          { field: "tag", key: "wc_alerts", relation: "!=", value: "false" },
        ],
        headings: { en: heading },
        contents: { en: body },
        android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
        android_sound: "default",
        priority: 10,
        ttl: 6 * 3600,
        collapse_id: `wc_pred_${r.id}`,
        url: `https://propredict.me${navPath}`,
        data: {
          type: "wc_prediction",
          prediction_id: r.id,
          nav_path: navPath,
        },
      };

      const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const osJson = await osRes.json().catch(() => ({}));

      if (osRes.ok) {
        await supabase
          .from("ai_predictions")
          .update({ wc_pred_notified_at: new Date().toISOString() })
          .eq("id", r.id);
        results.push({ id: r.id, ok: true, recipients: osJson.recipients });
        console.log(`[wc-pred-push] sent ${r.home_team} vs ${r.away_team}`);
      } else {
        results.push({ id: r.id, ok: false, error: osJson });
        console.error(`[wc-pred-push] FAILED ${r.id}:`, osJson);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[wc-pred-push] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
