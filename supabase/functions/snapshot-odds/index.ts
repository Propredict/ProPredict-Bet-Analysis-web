// Snapshot multi-bookmaker odds for today's AI predictions, compute consensus,
// detect line movement vs previous snapshot, and apply a subtle ±1-3% confidence
// adjustment to ai_predictions. Designed to run every 30 min via pg_cron.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Pinnacle gets higher weight (sharp book). Others uniform.
const BOOKMAKER_WEIGHTS: Record<number, number> = {
  4: 2.5,   // Pinnacle
  8: 1.2,   // Bet365
  6: 1.0,   // Bwin
  11: 1.0,  // 1xBet
  16: 1.0,  // Betfair
};
const DEFAULT_WEIGHT = 0.8;

interface Snapshot {
  match_id: string;
  match_date: string | null;
  bookmakers_count: number;
  consensus_home: number | null;
  consensus_draw: number | null;
  consensus_away: number | null;
  implied_home: number | null;
  implied_draw: number | null;
  implied_away: number | null;
}

function weightedAvg(values: Array<{ odd: number; w: number }>): number | null {
  const valid = values.filter((v) => Number.isFinite(v.odd) && v.odd > 1);
  if (valid.length === 0) return null;
  const sumW = valid.reduce((s, v) => s + v.w, 0);
  if (sumW === 0) return null;
  return valid.reduce((s, v) => s + v.odd * v.w, 0) / sumW;
}

function impliedProb(odd: number | null): number | null {
  if (!odd || odd <= 1) return null;
  return 1 / odd;
}

async function fetchOddsForFixture(apiKey: string, fixtureId: string) {
  const res = await fetch(`${API_FOOTBALL_URL}/odds?fixture=${fixtureId}&bet=1`, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.response?.[0] ?? null;
}

function buildSnapshot(matchId: string, matchDate: string | null, raw: any): Snapshot | null {
  if (!raw) return null;
  const bookmakers = raw.bookmakers || [];
  if (bookmakers.length === 0) return null;

  const home: Array<{ odd: number; w: number }> = [];
  const draw: Array<{ odd: number; w: number }> = [];
  const away: Array<{ odd: number; w: number }> = [];

  for (const bm of bookmakers) {
    const w = BOOKMAKER_WEIGHTS[bm.id] ?? DEFAULT_WEIGHT;
    const matchWinner = (bm.bets || []).find((b: any) => b.id === 1 || /match\s*winner/i.test(b.name));
    if (!matchWinner) continue;
    for (const v of matchWinner.values || []) {
      const odd = parseFloat(v.odd);
      const val = String(v.value).toLowerCase();
      if (val === "home" || val === "1") home.push({ odd, w });
      else if (val === "draw" || val === "x") draw.push({ odd, w });
      else if (val === "away" || val === "2") away.push({ odd, w });
    }
  }

  const cHome = weightedAvg(home);
  const cDraw = weightedAvg(draw);
  const cAway = weightedAvg(away);

  return {
    match_id: matchId,
    match_date: matchDate,
    bookmakers_count: bookmakers.length,
    consensus_home: cHome,
    consensus_draw: cDraw,
    consensus_away: cAway,
    implied_home: impliedProb(cHome),
    implied_draw: impliedProb(cDraw),
    implied_away: impliedProb(cAway),
  };
}

/**
 * Compute movement vs previous snapshot for the predicted side.
 * Returns nudge in -3..+3.
 *  - If predicted-side odds DROP (smart money entering) → +nudge
 *  - If predicted-side odds RISE (market fading pick) → -nudge
 * Magnitude scales with |movement_pct|.
 */
function computeNudge(
  prediction: string,
  prev: Snapshot | null,
  curr: Snapshot
): { adjustment: number; trend: string; strength: string; movementPct: number; consensusOdds: number | null } {
  const pred = (prediction || "").toLowerCase();
  let key: "consensus_home" | "consensus_draw" | "consensus_away" = "consensus_home";
  if (pred.includes("home") || pred === "1") key = "consensus_home";
  else if (pred.includes("draw") || pred === "x") key = "consensus_draw";
  else if (pred.includes("away") || pred === "2") key = "consensus_away";

  const currOdds = curr[key];
  const prevOdds = prev?.[key] ?? null;

  if (!currOdds) {
    return { adjustment: 0, trend: "stable", strength: "weak", movementPct: 0, consensusOdds: currOdds };
  }
  if (!prevOdds) {
    return { adjustment: 0, trend: "stable", strength: "weak", movementPct: 0, consensusOdds: currOdds };
  }

  const movementPct = ((currOdds - prevOdds) / prevOdds) * 100; // negative = dropped

  // Map magnitude → nudge (1, 2, or 3)
  const mag = Math.abs(movementPct);
  let nudge = 0;
  if (mag >= 1 && mag < 3) nudge = 1;
  else if (mag >= 3 && mag < 6) nudge = 2;
  else if (mag >= 6) nudge = 3;

  let trend: string = "stable";
  let strength: string = "weak";
  let adjustment = 0;

  if (movementPct < -1) {
    // Odds dropping → smart money on our side
    trend = "dropping";
    adjustment = +nudge;
    strength = nudge >= 3 ? "strong" : nudge === 2 ? "moderate" : "weak";
  } else if (movementPct > 1) {
    trend = "rising";
    adjustment = -nudge;
    strength = nudge >= 3 ? "strong" : nudge === 2 ? "moderate" : "weak";
  }

  return { adjustment, trend, strength, movementPct, consensusOdds: currOdds };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Today + tomorrow predictions only
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const dates = [fmt(today), fmt(tomorrow)];

    const { data: predictions, error: predErr } = await supabase
      .from("ai_predictions")
      .select("id, match_id, match_date, prediction, confidence, home_win, draw, away_win")
      .in("match_date", dates)
      .eq("result_status", "pending")
      .limit(500);

    if (predErr) {
      console.error("Failed to load predictions:", predErr);
      return new Response(JSON.stringify({ error: predErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    let processed = 0;
    let updated = 0;

    for (const p of predictions ?? []) {
      processed++;
      try {
        const raw = await fetchOddsForFixture(apiKey, p.match_id);
        const snap = buildSnapshot(p.match_id, p.match_date, raw);
        if (!snap) continue;

        // Get most recent previous snapshot
        const { data: prevRows } = await supabase
          .from("odds_snapshots")
          .select("*")
          .eq("match_id", p.match_id)
          .order("captured_at", { ascending: false })
          .limit(1);
        const prev = (prevRows?.[0] ?? null) as Snapshot | null;

        // Insert new snapshot
        await supabase.from("odds_snapshots").insert({
          match_id: snap.match_id,
          match_date: snap.match_date,
          bookmakers_count: snap.bookmakers_count,
          consensus_home: snap.consensus_home,
          consensus_draw: snap.consensus_draw,
          consensus_away: snap.consensus_away,
          implied_home: snap.implied_home,
          implied_draw: snap.implied_draw,
          implied_away: snap.implied_away,
        });

        const { adjustment, trend, strength, movementPct, consensusOdds } =
          computeNudge(p.prediction || "", prev, snap);

        // Apply subtle adjustment to confidence (clamped 1..99)
        const baseConfidence = Number(p.confidence ?? 0);
        const newConfidence = Math.max(1, Math.min(99, Math.round(baseConfidence + adjustment)));

        // ─── Value Bet Engine ────────────────────────────────────────────────
        // value = (AI_probability * consensus_odds) - 1
        // Reliability gate: need at least 2 bookmakers in consensus.
        const reliable = (snap.bookmakers_count ?? 0) >= 2;
        const aiProbHome = Number(p.home_win ?? 0) / 100;
        const aiProbDraw = Number(p.draw ?? 0) / 100;
        const aiProbAway = Number(p.away_win ?? 0) / 100;

        const valueHome = reliable && snap.consensus_home
          ? +(aiProbHome * snap.consensus_home - 1).toFixed(4)
          : null;
        const valueDraw = reliable && snap.consensus_draw
          ? +(aiProbDraw * snap.consensus_draw - 1).toFixed(4)
          : null;
        const valueAway = reliable && snap.consensus_away
          ? +(aiProbAway * snap.consensus_away - 1).toFixed(4)
          : null;

        // is_value_bet = true ONLY when the AI's predicted side has value > 0.10
        const pred = (p.prediction || "").toLowerCase();
        let predictedSideValue: number | null = null;
        if (pred.includes("home") || pred === "1") predictedSideValue = valueHome;
        else if (pred.includes("draw") || pred === "x") predictedSideValue = valueDraw;
        else if (pred.includes("away") || pred === "2") predictedSideValue = valueAway;

        const isValueBet = predictedSideValue != null && predictedSideValue > 0.10;

        await supabase
          .from("ai_predictions")
          .update({
            market_trend: trend,
            market_trend_strength: strength,
            odds_movement_pct: Number(movementPct.toFixed(2)),
            consensus_odds: consensusOdds,
            bookmakers_count: snap.bookmakers_count,
            confidence_adjustment: adjustment,
            confidence: newConfidence,
            value_home: valueHome,
            value_draw: valueDraw,
            value_away: valueAway,
            is_value_bet: isValueBet,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);

        updated++;
        results.push({
          match_id: p.match_id, trend, strength, movementPct, adjustment,
          valueHome, valueDraw, valueAway, isValueBet, reliable,
        });
      } catch (e) {
        console.error("Snapshot error for", p.match_id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, updated, sample: results.slice(0, 10) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("snapshot-odds fatal:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
