import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * AI Tips Generator (single picks for /daily-tips, /pro-tips, /premium-tips).
 *
 * Generates up to 3 single tips per day with category='ai_daily':
 *   - 1 Free tip  (tier='free',      from Free pool, confidence < 65)
 *   - 1 Pro tip   (tier='exclusive', from Pro pool,  confidence 65-77)
 *   - 1 Premium   (tier='premium',   from Premium pool, confidence >= 78)
 *
 * Market diversity: prefer Over/Under 2.5 and BTTS over 1X2 home/away win.
 * Never touches admin tips (category 'standard' / 'risk_of_day' / 'diamond_pick').
 */

type Pred = {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  match_date: string;
  prediction: string;
  confidence: number;
  consensus_odds: number | null;
  variance_stable: boolean | null;
  predicted_score: string | null;
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
  market_odds?: Record<string, number> | null;
};

function todayBelgrade(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

function poissonProb(lambda: number, k: number): number {
  let r = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) r *= lambda / i;
  return r;
}
function clampProb(n: number, min = 5, max = 95) { return Math.max(min, Math.min(max, Math.round(n))); }

function goalMarketProbs(p: Pred) {
  const m = (p.predicted_score || "").trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const homeXg = m ? Math.max(0.4, parseInt(m[1], 10) * 0.85 + 0.2) : Math.max(0.5, (p.home_win ?? 40) / 30);
  const awayXg = m ? Math.max(0.3, parseInt(m[2], 10) * 0.85 + 0.15) : Math.max(0.4, (p.away_win ?? 30) / 30);
  let o15 = 0, o25 = 0, o35 = 0, gg = 0;
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) {
    const pr = poissonProb(homeXg, h) * poissonProb(awayXg, a);
    if (h + a > 1) o15 += pr;
    if (h + a > 2) o25 += pr;
    if (h + a > 3) o35 += pr;
    if (h > 0 && a > 0) gg += pr;
  }
  return {
    over15: clampProb(o15 * 100),
    over25: clampProb(o25 * 100),
    over35: clampProb(o35 * 100),
    under25: clampProb(100 - o25 * 100),
    bttsYes: clampProb(gg * 100),
    bttsNo: clampProb(100 - gg * 100),
  };
}

function calibratedOdds(label: string, predictedScore: string | null): number | null {
  const s = (label || "").toLowerCase();
  const m = (predictedScore || "").trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const hg = m ? parseInt(m[1], 10) : -1;
  const ag = m ? parseInt(m[2], 10) : -1;
  const total = hg >= 0 ? hg + ag : -1;
  if (/over\s*2\.?5/.test(s)) {
    if (total < 0) return 1.85;
    if (total >= 5) return 1.25;
    if (total === 4) return 1.42;
    if (total === 3) return 1.65;
    if (total === 2) return 2.50;
    return 4.20;
  }
  if (/under\s*2\.?5/.test(s)) {
    if (total < 0) return 1.85;
    if (total <= 1) return 1.28;
    if (total === 2) return 1.55;
    if (total === 3) return 2.40;
    return 4.20;
  }
  if (/over\s*1\.?5/.test(s)) {
    if (total < 0) return 1.30;
    if (total >= 3) return 1.20;
    if (total === 2) return 1.45;
    return 2.80;
  }
  if (/^gg\b/.test(s) || /btts\s*yes/.test(s) || /both\s*teams/.test(s)) {
    if (hg < 0 || ag < 0) return 1.75;
    if (hg >= 2 && ag >= 2) return 1.38;
    if (hg >= 1 && ag >= 1) return 1.65;
    return 3.20;
  }
  if (/^ng\b/.test(s) || /btts\s*no/.test(s)) {
    if (hg < 0 || ag < 0) return 1.85;
    if (hg === 0 || ag === 0) return 1.50;
    return 2.20;
  }
  return null;
}

function odds1X2(p: Pred): number {
  if (p.consensus_odds && p.consensus_odds > 1.05) return Number(p.consensus_odds);
  if (p.confidence > 0) return Math.max(1.15, Math.round((100 / p.confidence) * 100) / 100);
  return 1.85;
}

function marketKey(label: string): string | null {
  const s = (label || "").toLowerCase();
  if (/over\s*1\.?5/.test(s)) return "over_1_5";
  if (/over\s*2\.?5/.test(s)) return "over_2_5";
  if (/under\s*2\.?5/.test(s)) return "under_2_5";
  if (/over\s*3\.?5/.test(s)) return "over_3_5";
  if (/^gg\b/.test(s) || /btts\s*yes/.test(s)) return "btts_yes";
  if (/^ng\b/.test(s) || /btts\s*no/.test(s)) return "btts_no";
  return null;
}

function oddsForLabel(p: Pred, label: string): number {
  const k = marketKey(label);
  if (k && p.market_odds && typeof p.market_odds[k] === "number" && p.market_odds[k] > 1.05) return Number(p.market_odds[k]);
  const c = calibratedOdds(label, p.predicted_score);
  if (c !== null) return c;
  return odds1X2(p);
}

/**
 * Pick the BEST market for this prediction with strong preference for goal markets
 * (Over/Under 2.5, BTTS) over 1X2. Returns null if nothing safe (>= 60% prob).
 */
function pickSafeMarket(p: Pred): { label: string; odds: number; prob: number } | null {
  const hw = p.home_win ?? 33, dr = p.draw ?? 33, aw = p.away_win ?? 33;
  const g = goalMarketProbs(p);

  // Boost goal-market candidates so we don't keep returning Home/Away Win.
  const candidates: { label: string; prob: number; bonus: number }[] = [
    { label: "Over 2.5", prob: g.over25, bonus: 12 },
    { label: "Under 2.5", prob: g.under25, bonus: 10 },
    { label: "BTTS Yes", prob: g.bttsYes, bonus: 10 },
    { label: "BTTS No", prob: g.bttsNo, bonus: 8 },
    { label: "Over 1.5", prob: g.over15, bonus: 6 },
    { label: "Home Win", prob: hw, bonus: 0 },
    { label: "Away Win", prob: aw, bonus: 0 },
    { label: "Draw", prob: dr, bonus: -10 },
  ];
  candidates.sort((a, b) => (b.prob + b.bonus) - (a.prob + a.bonus));
  const best = candidates.find((c) => c.prob >= 60);
  if (!best) return null;
  return { label: best.label, odds: oddsForLabel(p, best.label), prob: best.prob };
}

function isGoalMarket(label: string): boolean {
  return /over|under|btts|gg|ng/i.test(label);
}

/**
 * Pick one tip from `pool` with the highest-confidence safe market,
 * preferring matches whose chosen market type is NOT in `usedMarketTypes`
 * so the daily lineup stays diverse.
 */
function pickBestForTier(
  pool: Pred[],
  usedMatchIds: Set<string>,
  usedMarketTypes: Set<string>,
): { p: Pred; market: { label: string; odds: number; prob: number } } | null {
  // Sort by confidence DESC, prefer variance_stable
  const sorted = pool
    .filter((x) => !usedMatchIds.has(x.match_id))
    .slice()
    .sort((a, b) => (Number(b.variance_stable) - Number(a.variance_stable)) || (b.confidence - a.confidence));

  // First pass: only allow markets NOT yet used (diversity)
  for (const p of sorted) {
    const m = pickSafeMarket(p);
    if (!m) continue;
    const type = isGoalMarket(m.label) ? m.label.split(" ")[0].toLowerCase() : "1x2";
    if (!usedMarketTypes.has(type)) return { p, market: m };
  }
  // Second pass: any safe market
  for (const p of sorted) {
    const m = pickSafeMarket(p);
    if (m) return { p, market: m };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const date = todayBelgrade();

    // Always wipe today's AI tips first (only category='ai_daily').
    // Admin tips ('standard' / 'risk_of_day' / 'diamond_pick') are NEVER touched.
    const { data: toDel } = await supabase
      .from("tips")
      .select("id")
      .eq("tip_date", date)
      .eq("category", "ai_daily");
    const delIds = (toDel ?? []).map((t: any) => t.id);
    if (delIds.length > 0) {
      await supabase.from("tips").delete().in("id", delIds);
    }

    // Fetch today's AI predictions
    const baseCols = "id,match_id,home_team,away_team,league,match_date,prediction,confidence,consensus_odds,variance_stable,predicted_score,home_win,draw,away_win";
    let preds: any = null;
    const r1 = await supabase
      .from("ai_predictions")
      .select(`${baseCols},market_odds`)
      .eq("match_date", date)
      .gte("confidence", 50)
      .order("confidence", { ascending: false })
      .limit(120);
    if (r1.error) {
      const r2 = await supabase
        .from("ai_predictions")
        .select(baseCols)
        .eq("match_date", date)
        .gte("confidence", 50)
        .order("confidence", { ascending: false })
        .limit(120);
      if (r2.error) throw r2.error;
      preds = r2.data;
    } else {
      preds = r1.data;
    }
    const all = (preds ?? []) as Pred[];

    const freePool = all.filter((p) => p.confidence < 65);
    const proPool = all.filter((p) => p.confidence >= 65 && p.confidence < 78);
    const premiumPool = all.filter((p) => p.confidence >= 78);

    const usedMatchIds = new Set<string>();
    const usedMarketTypes = new Set<string>();
    const created: Array<{ tier: string; pick: string; odds: number; confidence: number }> = [];

    // Targets:
    //   - up to 3 Free picks (scaled to pool size)
    //   - 1 Pro pick (sourced from Pro pool, gated as 'daily')
    //   - 1 Premium pick (sourced from Premium pool, gated as 'daily')
    // All tips land on /daily-predictions. tier='free' = always visible, tier='daily' = unlock/sub.
    const freeTarget = freePool.length >= 8 ? 3 : (freePool.length >= 4 ? 2 : 1);

    type TierJob = { name: string; pool: Pred[]; tier: string; count: number };
    const jobs: TierJob[] = [
      { name: "Free",    pool: freePool,    tier: "free",  count: freeTarget },
      { name: "Pro",     pool: proPool,     tier: "daily", count: 1 },
      { name: "Premium", pool: premiumPool, tier: "daily", count: 1 },
    ];

    for (const job of jobs) {
      let candidatePool = job.pool;
      if (candidatePool.length === 0 && job.name === "Premium") candidatePool = proPool;
      if (candidatePool.length === 0 && job.name === "Pro") candidatePool = freePool.filter((p) => p.confidence >= 60);
      if (candidatePool.length === 0) continue;

      for (let n = 0; n < job.count; n++) {
        const choice = pickBestForTier(candidatePool, usedMatchIds, usedMarketTypes);
        if (!choice) break;

        const { p, market } = choice;
        const { error: insErr } = await supabase.from("tips").insert({
          home_team: p.home_team,
          away_team: p.away_team,
          league: p.league ?? "",
          prediction: market.label,
          ai_prediction: market.label,
          odds: Math.round(market.odds * 100) / 100,
          confidence: p.confidence,
          tier: job.tier,
          status: "published",
          category: "ai_daily",
          tip_date: date,
        });
        if (insErr) throw insErr;

        usedMatchIds.add(p.match_id);
        const type = isGoalMarket(market.label) ? market.label.split(" ")[0].toLowerCase() : "1x2";
        usedMarketTypes.add(type);
        created.push({ tier: job.tier, pick: `${p.home_team} vs ${p.away_team} — ${market.label}`, odds: market.odds, confidence: p.confidence });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, date, deleted: delIds.length, created_count: created.length, created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("generate-ai-tips error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});