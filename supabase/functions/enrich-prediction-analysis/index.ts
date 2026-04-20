import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

/**
 * enrich-prediction-analysis
 *
 * Reads existing AI prediction rows from `ai_predictions` and rewrites their
 * `analysis` field with a narrative, data-grounded explanation generated via
 * Lovable AI Gateway. The model is given ONLY real numeric/contextual data
 * already stored on the row (form, xG, H2H summary, bookmaker consensus,
 * value bets, injuries, market trend, top scores). It is explicitly told to
 * never invent stats and to reference only the provided fields.
 *
 * Modes:
 *   POST { mode: "today" }            → enrich today's pending rows (default)
 *   POST { mode: "ids", ids: [...] }  → enrich specific prediction ids
 *   POST { mode: "missing" }          → enrich rows whose analysis is short / missing
 *   POST { mode: "all", limit: 200 }  → backfill, capped by limit
 *
 * Strict policy: if the row lacks the minimum data signals required to
 * justify a real narrative, it is SKIPPED (never filled with filler text).
 */

type PredictionRow = {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  match_date: string | null;
  match_time: string | null;
  prediction: string;
  predicted_score: string | null;
  confidence: number;
  home_win: number;
  draw: number;
  away_win: number;
  risk_level: string | null;
  analysis: string | null;
  xg_home: number | null;
  xg_away: number | null;
  xg_total: number | null;
  xg_diff: number | null;
  last_home_goals: number | null;
  last_away_goals: number | null;
  consensus_home: number | null;
  consensus_draw: number | null;
  consensus_away: number | null;
  bookmakers_count: number | null;
  value_home: number | null;
  value_draw: number | null;
  value_away: number | null;
  is_value_bet: boolean | null;
  market_trend: string | null;
  market_trend_strength: string | null;
  missing_home_players: any;
  missing_away_players: any;
  injury_impact_home: number | null;
  injury_impact_away: number | null;
  key_factors: string[] | null;
  is_premium: boolean | null;
  market_type: string | null;
};

/**
 * Decide whether a row has enough real data for a credible narrative.
 * Returns null if OK, or a string reason to skip.
 */
function lacksMinimumSignals(p: PredictionRow): string | null {
  const hasXg =
    (p.xg_home ?? 0) > 0 || (p.xg_away ?? 0) > 0 || (p.xg_total ?? 0) > 0;
  const hasForm =
    p.last_home_goals !== null && p.last_away_goals !== null;
  const hasConsensus =
    (p.consensus_home ?? 0) > 0 ||
    (p.consensus_draw ?? 0) > 0 ||
    (p.consensus_away ?? 0) > 0;
  const hasBookmakers = (p.bookmakers_count ?? 0) >= 2;

  // Need at least: form OR xG, AND market signal
  if (!hasXg && !hasForm) return "no-form-no-xg";
  if (!hasConsensus || !hasBookmakers) return "no-market-signal";
  return null;
}

function buildPrompt(p: PredictionRow): { system: string; user: string } {
  const system =
    "You are a professional football analyst writing concise, data-grounded match analysis for a sports prediction app. " +
    "Rules you must follow strictly: " +
    "1) Use ONLY the numeric data provided in the user message — never invent statistics, player names, or events. " +
    "2) Write 4 to 6 sentences in clear English. No bullet points, no markdown headings, no emojis. " +
    "3) Explain WHY the prediction makes sense by referencing the actual numbers (form, xG, market consensus, value, injuries). " +
    "4) Always mention: recent form snapshot, expected goals (xG), bookmaker consensus, and the specific reason this market (e.g. Over 2.5, BTTS, 1X2) is favored. " +
    "5) End with one sentence about risk or confidence level. " +
    "6) Do NOT use phrases like 'Pending data', 'Not found', 'Limited data', 'awaiting', or any disclaimer. If you cannot justify the prediction with the given data, output exactly: SKIP_INSUFFICIENT_DATA. " +
    "7) Never use betting jargon like 'bet', 'wager', 'stake'. Use 'pick', 'prediction', 'lean'.";

  const lines: string[] = [];
  lines.push(`Match: ${p.home_team} vs ${p.away_team}`);
  if (p.league) lines.push(`League: ${p.league}`);
  if (p.match_date) lines.push(`Date: ${p.match_date}${p.match_time ? " " + p.match_time : ""}`);
  lines.push(`Predicted market: ${p.prediction}${p.market_type ? " (" + p.market_type + ")" : ""}`);
  if (p.predicted_score) lines.push(`Predicted score: ${p.predicted_score}`);
  lines.push(`Model probabilities — Home win: ${p.home_win}% | Draw: ${p.draw}% | Away win: ${p.away_win}%`);
  lines.push(`Overall confidence: ${p.confidence}% (risk: ${p.risk_level || "medium"})`);

  if ((p.xg_home ?? 0) > 0 || (p.xg_away ?? 0) > 0) {
    lines.push(
      `Expected goals (xG) — ${p.home_team}: ${(p.xg_home ?? 0).toFixed(2)}, ${p.away_team}: ${(p.xg_away ?? 0).toFixed(2)} (total ${(p.xg_total ?? 0).toFixed(2)})`
    );
  }

  if (p.last_home_goals !== null && p.last_away_goals !== null) {
    lines.push(
      `Recent form (last 5) goals scored — ${p.home_team}: ${p.last_home_goals}, ${p.away_team}: ${p.last_away_goals}`
    );
  }

  if ((p.bookmakers_count ?? 0) > 0) {
    lines.push(
      `Bookmaker consensus across ${p.bookmakers_count} books — Home: ${(p.consensus_home ?? 0).toFixed(2)}, Draw: ${(p.consensus_draw ?? 0).toFixed(2)}, Away: ${(p.consensus_away ?? 0).toFixed(2)}`
    );
  }

  if (p.is_value_bet) {
    const val = Math.max(p.value_home ?? 0, p.value_draw ?? 0, p.value_away ?? 0);
    if (val > 0) {
      lines.push(`Value detected: model probability is ${val.toFixed(1)}% above market implied probability.`);
    }
  }

  if (p.market_trend) {
    lines.push(`Market trend: odds ${p.market_trend}${p.market_trend_strength ? " (" + p.market_trend_strength + ")" : ""}`);
  }

  const homeOut = Array.isArray(p.missing_home_players) ? p.missing_home_players.length : 0;
  const awayOut = Array.isArray(p.missing_away_players) ? p.missing_away_players.length : 0;
  if (homeOut > 0 || awayOut > 0) {
    lines.push(
      `Injuries / unavailable — ${p.home_team}: ${homeOut} player(s) (impact ${p.injury_impact_home ?? 0}/100), ${p.away_team}: ${awayOut} player(s) (impact ${p.injury_impact_away ?? 0}/100)`
    );
  }

  if (p.key_factors && p.key_factors.length > 0) {
    lines.push(`Key factors detected by model: ${p.key_factors.slice(0, 6).join(" | ")}`);
  }

  const user =
    "Write the analysis paragraph for the following match using ONLY this data:\n\n" +
    lines.join("\n") +
    "\n\nRemember: 4-6 sentences, plain English, reference the actual numbers, end with a confidence/risk note. " +
    "If the data above is too thin to justify the prediction, respond with exactly: SKIP_INSUFFICIENT_DATA.";

  return { system, user };
}

async function callLovableAI(
  apiKey: string,
  system: string,
  user: string
): Promise<{ ok: boolean; text?: string; error?: string; status?: number }> {
  try {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.55,
        max_tokens: 380,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, error: body.slice(0, 300) };
    }

    const json = await resp.json();
    const text: string = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
    if (!text) return { ok: false, error: "empty-response" };
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network-error" };
  }
}

function isUsableNarrative(text: string): boolean {
  if (!text) return false;
  if (text.includes("SKIP_INSUFFICIENT_DATA")) return false;
  if (text.length < 120) return false;
  const lower = text.toLowerCase();
  const banned = [
    "pending data",
    "not found in api",
    "limited team-form data",
    "limited data",
    "awaiting",
    "no data available",
    "insufficient data",
  ];
  for (const b of banned) if (lower.includes(b)) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const mode: string = body.mode || "today";
    const limit: number = Math.min(Number(body.limit) || 200, 500);

    let query = supabase
      .from("ai_predictions")
      .select(
        "id,match_id,home_team,away_team,league,match_date,match_time,prediction,predicted_score,confidence,home_win,draw,away_win,risk_level,analysis,xg_home,xg_away,xg_total,xg_diff,last_home_goals,last_away_goals,consensus_home,consensus_draw,consensus_away,bookmakers_count,value_home,value_draw,value_away,is_value_bet,market_trend,market_trend_strength,missing_home_players,missing_away_players,injury_impact_home,injury_impact_away,key_factors,is_premium,market_type"
      )
      .eq("result_status", "pending")
      .limit(limit);

    // Include yesterday too — predictions for today's matches in late timezones
    // can still have match_date = yesterday (UTC). This keeps the enrichment
    // window inclusive without touching already-resolved past predictions
    // (those have result_status != 'pending' and are filtered out above).
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    if (mode === "today") {
      query = query.gte("match_date", yesterday);
    } else if (mode === "ids" && Array.isArray(body.ids) && body.ids.length > 0) {
      query = query.in("id", body.ids.slice(0, 200));
    } else if (mode === "missing") {
      query = query.gte("match_date", yesterday);
    } else if (mode === "all") {
      query = query.gte("match_date", yesterday);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "fetch failed", details: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let candidates = (rows ?? []) as PredictionRow[];

    if (mode === "missing") {
      candidates = candidates.filter((p) => {
        const a = (p.analysis ?? "").trim();
        if (a.length < 200) return true;
        const lower = a.toLowerCase();
        return (
          lower.includes("pending data") ||
          lower.includes("not found") ||
          lower.includes("limited data")
        );
      });
    }

    let enriched = 0;
    let skipped = 0;
    let failed = 0;
    const skipReasons: Record<string, number> = {};

    for (const p of candidates) {
      const skipReason = lacksMinimumSignals(p);
      if (skipReason) {
        skipped++;
        skipReasons[skipReason] = (skipReasons[skipReason] ?? 0) + 1;
        continue;
      }

      const { system, user } = buildPrompt(p);
      const ai = await callLovableAI(lovableKey, system, user);

      if (!ai.ok) {
        failed++;
        if (ai.status === 429) {
          // back off a bit then continue
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (ai.status === 402) {
          return new Response(
            JSON.stringify({
              error: "AI credits exhausted",
              enriched,
              skipped,
              failed,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        continue;
      }

      const narrative = ai.text!.trim();
      if (!isUsableNarrative(narrative)) {
        skipped++;
        skipReasons["ai-rejected"] = (skipReasons["ai-rejected"] ?? 0) + 1;
        continue;
      }

      const { error: updErr } = await supabase
        .from("ai_predictions")
        .update({ analysis: narrative })
        .eq("id", p.id);

      if (updErr) {
        failed++;
        continue;
      }

      enriched++;

      // gentle pacing to respect rate limits
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        total_candidates: candidates.length,
        enriched,
        skipped,
        failed,
        skip_reasons: skipReasons,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[enrich-prediction-analysis] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});