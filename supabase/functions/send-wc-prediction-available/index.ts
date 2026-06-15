/**
 * send-wc-prediction-available
 *
 * Hourly cron-triggered. Finds World Cup AI predictions that:
 *  - have `prediction` populated (frozen, ready to view)
 *  - kick off within the next ~6 hours
 *  - haven't been announced yet (wc_pred_notified_at IS NULL)
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

const LOOKAHEAD_HOURS = 6; // notify ~6h before kickoff

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

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = new Date(now.getTime() + 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];

    // Pull WC predictions for today + tomorrow that already have a pick.
    const { data: rows, error } = await supabase
      .from("ai_predictions")
      .select(
        "id, home_team, away_team, prediction, confidence, match_date, match_time, league, wc_pred_notified_at"
      )
      .ilike("league", "%world cup%")
      .in("match_date", [todayStr, tomorrowStr])
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
      const hoursToKO = (koMs - Date.now()) / 3600000;
      // Within next 6h, and not already kicked off
      return hoursToKO > 0 && hoursToKO <= LOOKAHEAD_HOURS;
    });

    console.log(
      `[wc-pred-push] ${rows?.length ?? 0} candidates, ${candidates.length} within ${LOOKAHEAD_HOURS}h`
    );

    const results: Array<Record<string, unknown>> = [];

    for (const r of candidates) {
      const heading = `🏆 WC Prediction Ready: ${r.home_team} vs ${r.away_team}`;
      const conf = r.confidence ? `${r.confidence}% confidence` : "AI pick ready";
      const body = `Our AI pick is locked in — ${conf}. Tap to see the full analysis before kickoff.`;

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
        data: {
          type: "wc_prediction",
          prediction_id: r.id,
          nav_path: "/world-cup-2026?tab=predictions",
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
