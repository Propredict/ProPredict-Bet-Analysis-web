/**
 * generate-due-predictions
 *
 * Per-match staggered AI prediction enrichment.
 * Runs every 30 minutes via pg_cron. Selects placeholder predictions
 * whose kickoff is within the next 3h window and has NOT started yet,
 * then enriches them ONE BY ONE by
 * calling the existing generate-ai-predictions function in single-fixture
 * mode. Each successfully enriched match gets a "AI Pick Ready" push.
 *
 * Key guarantees:
 *  - A prediction is enriched ONLY when kickoff is <= 3h away.
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

// Window: enrich matches starting in <= 3h from now, but NEVER after kickoff.
// This means a 00:00 kickoff becomes due at 21:00 and stops being eligible at
// 00:00. Once written, the prediction is FROZEN (placeholder rows are the only
// candidates; enriched rows are never touched again).
const DUE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3h before kickoff

// ============ POISSON HELPERS (for safe-pick market scan) ============
// Used to derive Over/Under 2.5 and BTTS probabilities from the xG that
// generate-ai-predictions already returned for this match. Keeps this
// function self-contained — no extra API calls.
function _poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}
function poissonMarkets(xgHome: number, xgAway: number): {
  over25: number; under25: number; bttsYes: number; bttsNo: number;
} {
  const xh = Math.max(0.1, Math.min(5, xgHome));
  const xa = Math.max(0.1, Math.min(5, xgAway));
  const MAX = 7;
  let over25 = 0;
  let bttsYes = 0;
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = _poissonPmf(h, xh) * _poissonPmf(a, xa);
      if (h + a > 2) over25 += p;
      if (h > 0 && a > 0) bttsYes += p;
    }
  }
  return {
    over25: Math.round(over25 * 100),
    under25: Math.round((1 - over25) * 100),
    bttsYes: Math.round(bttsYes * 100),
    bttsNo: Math.round((1 - bttsYes) * 100),
  };
}

function getKickoffMs(row: { match_timestamp?: string | null; match_date?: string | null; match_time?: string | null }): number | null {
  if (row.match_timestamp) {
    const ts = new Date(row.match_timestamp).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  if (row.match_date && row.match_time) {
    const t = row.match_time.length >= 5 ? row.match_time.slice(0, 5) : row.match_time;
    const ts = new Date(`${row.match_date}T${t}:00Z`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + DUE_WINDOW_MS);
    const windowStart = now;

    // Find WORLD CUP placeholder predictions whose kickoff is within the due window.
    // Staggered enrichment applies ONLY to World Cup matches — other leagues
    // are generated normally at batch time. New rows use match_timestamp; legacy
    // placeholder rows may only have match_date + match_time, so we also load
    // those and filter them in code.
    const baseSelect = "id, match_id, home_team, away_team, league, match_timestamp, match_date, match_time, push_sent_at, wc_pred_notified_at, analysis";
    const { data: timestampRows, error: queryErr } = await supabase
      .from("ai_predictions")
      .select(baseSelect)
      .ilike("analysis", "Pending regeneration%")
      .ilike("league", "%World Cup%")
      .is("push_sent_at", null)
      .is("wc_pred_notified_at", null)
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

    const startDate = windowStart.toISOString().slice(0, 10);
    const endDate = windowEnd.toISOString().slice(0, 10);
    const { data: legacyRows, error: legacyErr } = await supabase
      .from("ai_predictions")
      .select(baseSelect)
      .ilike("analysis", "Pending regeneration%")
      .ilike("league", "%World Cup%")
      .is("push_sent_at", null)
      .is("wc_pred_notified_at", null)
      .is("match_timestamp", null)
      .gte("match_date", startDate)
      .lte("match_date", endDate)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .limit(50);

    if (legacyErr) {
      console.error("[due-preds] legacy query error:", legacyErr.message);
      return new Response(JSON.stringify({ ok: false, error: legacyErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const windowStartMs = windowStart.getTime();
    const windowEndMs = windowEnd.getTime();
    const byId = new Map<string, any>();
    for (const row of [...(timestampRows ?? []), ...(legacyRows ?? [])]) {
      const koMs = getKickoffMs(row);
      if (koMs != null && koMs > windowStartMs && koMs <= windowEndMs) byId.set(row.id, row);
    }
    const candidates = [...byId.values()].sort((a, b) => (getKickoffMs(a) ?? 0) - (getKickoffMs(b) ?? 0));

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
            apikey: SERVICE_KEY,
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

        // ============ WORLD CUP SAFE-PICK GUARD ============
        // World Cup notifications must advertise a strong, safe tip.
        // If the model's chosen 1X2 pick has confidence < 70, automatically
        // promote it to a Double Chance market (1X / X2 / 12) — combine the
        // two highest 1X2 outcomes so the advertised pick is genuinely safer.
        // Only applies when we have valid 1X2 probabilities and the original
        // pick is a single-team result ("1", "2") or a low-confidence Draw.
        const SAFE_CONF_FLOOR = 70;
        const isSingle1X2 = pred.prediction === "1" || pred.prediction === "X" || pred.prediction === "2";
        const hw = Number(pred.home_win);
        const dw = Number(pred.draw);
        const aw = Number(pred.away_win);
        const has1X2 = [hw, dw, aw].every((v) => Number.isFinite(v) && v >= 0);
        if (
          isSingle1X2 &&
          has1X2 &&
          Number(pred.confidence ?? 0) < SAFE_CONF_FLOOR
        ) {
          // Find the two highest 1X2 outcomes.
          const ordered = [
            { key: "1", val: hw },
            { key: "X", val: dw },
            { key: "2", val: aw },
          ].sort((a, b) => b.val - a.val);
          const topTwo = [ordered[0].key, ordered[1].key].sort();
          const dcMap: Record<string, string> = {
            "1,X": "Double Chance 1X",
            "X,2": "Double Chance X2",
            "1,2": "Double Chance 12",
          };
          const dcKey = topTwo.join(",");
          const dcPick = dcMap[dcKey];
          if (dcPick) {
            const dcProb = Math.min(95, Math.max(SAFE_CONF_FLOOR, Math.round(ordered[0].val + ordered[1].val)));
            const safeNote = ` Safe-pick guard: promoted to ${dcPick} (combined ${dcProb}%) because single-result confidence was below ${SAFE_CONF_FLOOR}%.`;
            pred.prediction = dcPick;
            pred.confidence = dcProb;
            pred.risk_level = "low";
            pred.analysis = `${pred.analysis ?? ""}${safeNote}`;
          }
        }

        // Write enrichment back ONLY to a placeholder row. If anything already
        // enriched this match, do not overwrite the pick users have seen.
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
            wc_pred_notified_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .ilike("analysis", "Pending regeneration%");

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
            apikey: SERVICE_KEY,
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