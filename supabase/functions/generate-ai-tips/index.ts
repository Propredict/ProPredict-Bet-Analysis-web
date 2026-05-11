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
  match_time: string | null;
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
    under35: clampProb(100 - o35 * 100),
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
  if (/under\s*3\.?5/.test(s)) {
    if (total < 0) return 1.45;
    if (total <= 2) return 1.25;
    if (total === 3) return 1.50;
    if (total === 4) return 2.20;
    return 4.50;
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
  if (/under\s*3\.?5/.test(s)) return "under_3_5";
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

/**
 * Pro Insights variant: allow ALL market types (1X2, Over/Under 2.5/3.5, BTTS),
 * still safe (>= 60% prob) but optimize for stronger odds (value pick).
 * Score = prob * 0.6 + odds*10 (rewards higher odds while staying safe).
 */
function pickSafeMarketPro(p: Pred): { label: string; odds: number; prob: number } | null {
  const hw = p.home_win ?? 33, dr = p.draw ?? 33, aw = p.away_win ?? 33;
  const g = goalMarketProbs(p);

  const candidates: { label: string; prob: number }[] = [
    { label: "Over 2.5", prob: g.over25 },
    { label: "Under 2.5", prob: g.under25 },
    { label: "Under 3.5", prob: g.under35 },
    { label: "BTTS Yes", prob: g.bttsYes },
    { label: "BTTS No", prob: g.bttsNo },
    { label: "Over 1.5", prob: g.over15 },
    { label: "Home Win", prob: hw },
    { label: "Away Win", prob: aw },
  ];

  const safe = candidates
    .filter((c) => c.prob >= 60)
    .map((c) => ({ ...c, odds: oddsForLabel(p, c.label) }))
    // skip super-low value picks (< 1.30) — Pro should have decent odds
    .filter((c) => c.odds >= 1.30)
    .sort((a, b) => (b.prob * 0.55 + b.odds * 12) - (a.prob * 0.55 + a.odds * 12));

  if (safe.length === 0) {
    // fallback: any safe market regardless of odds
    return pickSafeMarket(p);
  }
  const best = safe[0];
  return { label: best.label, odds: best.odds, prob: best.prob };
}

function isGoalMarket(label: string): boolean {
  return /over|under|btts|gg|ng/i.test(label);
}

/**
 * Hard consistency guard: a chosen market label must NOT contradict the AI's
 * predicted score. E.g. if predicted_score = "1-2" (total 3, both teams scored),
 * we must reject "Under 2.5", "BTTS No", "Home Win", "Draw", etc.
 * This prevents the situation where the tip says "Under 2.5" while the AI
 * Prediction page shows score 2-1 / Over 2.5 / BTTS Yes.
 */
function marketConsistentWithScore(label: string, predictedScore: string | null): boolean {
  const s = (label || "").toLowerCase().trim();
  if (!s) return true;
  const m = (predictedScore || "").trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  if (!m) return true; // no score → cannot validate, allow
  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  const total = hg + ag;

  // Combo markets — split on '&' and validate each leg
  if (s.includes("&")) {
    return s.split("&").every((leg) => marketConsistentWithScore(leg.trim(), predictedScore));
  }

  if ((/^gg\b/.test(s) || /btts\s*yes/.test(s) || /both\s*teams/.test(s)) && (hg === 0 || ag === 0)) return false;
  if ((/^ng\b/.test(s) || /btts\s*no/.test(s)) && hg > 0 && ag > 0) return false;
  if (/over\s*1\.?5/.test(s) && total <= 1) return false;
  if (/under\s*1\.?5/.test(s) && total >= 2) return false;
  if (/over\s*2\.?5/.test(s) && total <= 2) return false;
  if (/under\s*2\.?5/.test(s) && total >= 3) return false;
  if (/over\s*3\.?5/.test(s) && total <= 3) return false;
  if (/under\s*3\.?5/.test(s) && total >= 4) return false;
  // 1X2 single legs
  if ((s === "1" || /home\s*win/.test(s)) && hg <= ag) return false;
  if ((s === "2" || /away\s*win/.test(s)) && ag <= hg) return false;
  if ((s === "x" || /^draw$/.test(s)) && hg !== ag) return false;
  // Double chance
  if (s === "1x" && ag > hg) return false;        // 1X loses only when away wins
  if (s === "x2" && hg > ag) return false;        // X2 loses only when home wins
  if (s === "12" && hg === ag) return false;      // 12 loses on draw
  return true;
}

/**
 * Premium combo picker: returns a SAFE combination market like
 * "1 & Over 2.5", "1X & Under 2.5", "X2 & Under 3.5", "12 & Over 1.5", etc.
 * Combo prob = p1 * p2 (approx). Safe threshold >= 55%.
 * Odds estimated as 1 / (prob/100) * 0.92 (margin), clamped to >= 1.40.
 */
function pickSafeCombo(p: Pred, avoidKeys: Set<string> = new Set()): { label: string; odds: number; prob: number } | null {
  const hw = p.home_win ?? 33, dr = p.draw ?? 33, aw = p.away_win ?? 33;
  const g = goalMarketProbs(p);

  const oneX = Math.min(95, hw + dr);   // 1X
  const xTwo = Math.min(95, dr + aw);   // X2
  const twelve = Math.min(95, hw + aw); // 12

  // 12 (Home or Away) only makes sense when there is NO clear favorite.
  // If one side dominates, "12" is misleading — the straight "1 & ..." or
  // "2 & ..." combo is far more accurate and aligned with the AI prediction.
  const noClearFavorite = Math.abs(hw - aw) <= 12 && hw < 55 && aw < 55;

  const candidates: { label: string; prob: number }[] = [
    { label: "1 & Over 1.5",   prob: (hw * g.over15) / 100 },
    { label: "1 & Over 2.5",   prob: (hw * g.over25) / 100 },
    { label: "2 & Over 1.5",   prob: (aw * g.over15) / 100 },
    { label: "2 & Over 2.5",   prob: (aw * g.over25) / 100 },
    { label: "1X & Under 2.5", prob: (oneX * g.under25) / 100 },
    { label: "1X & Under 3.5", prob: (oneX * g.under35) / 100 },
    { label: "X2 & Under 2.5", prob: (xTwo * g.under25) / 100 },
    { label: "X2 & Under 3.5", prob: (xTwo * g.under35) / 100 },
    ...(noClearFavorite ? [
      { label: "12 & Over 1.5",  prob: (twelve * g.over15) / 100 },
      { label: "12 & Over 2.5",  prob: (twelve * g.over25) / 100 },
    ] : []),
    { label: "1 & BTTS Yes",   prob: (hw * g.bttsYes) / 100 },
    { label: "2 & BTTS Yes",   prob: (aw * g.bttsYes) / 100 },
  ];

  const safe = candidates
    .map((c) => ({ ...c, prob: clampProb(c.prob, 5, 95) }))
    .filter((c) => c.prob >= 55)
    .map((c) => {
      const odds = Math.max(1.40, Math.round((100 / c.prob) * 0.92 * 100) / 100);
      return { ...c, odds };
    })
    // Skip super tight combos with weak value
    .filter((c) => c.odds >= 1.40 && c.odds <= 5.0)
    // Best score: balance probability vs decent odds
    .sort((a, b) => (b.prob * 0.5 + b.odds * 14) - (a.prob * 0.5 + a.odds * 14));

  if (safe.length === 0) return null;
  // Prefer combos whose diversity key hasn't been used yet
  const fresh = safe.find((c) => !avoidKeys.has(marketDiversityKey(c.label)));
  return fresh ?? safe[0];
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
  picker: (p: Pred, avoid?: Set<string>) => { label: string; odds: number; prob: number } | null = pickSafeMarket,
): { p: Pred; market: { label: string; odds: number; prob: number } } | null {
  // Sort by confidence DESC, prefer variance_stable
  const sorted = pool
    .filter((x) => !usedMatchIds.has(x.match_id))
    .slice()
    .sort((a, b) => (Number(b.variance_stable) - Number(a.variance_stable)) || (b.confidence - a.confidence));

  // First pass: only allow markets NOT yet used (diversity)
  for (const p of sorted) {
    const m = picker(p, usedMarketTypes);
    if (!m) continue;
    const type = marketDiversityKey(m.label);
    if (!usedMarketTypes.has(type)) return { p, market: m };
  }
  // Second pass: any safe market
  for (const p of sorted) {
    const m = picker(p, usedMarketTypes);
    if (m) return { p, market: m };
  }
  return null;
}

function marketDiversityKey(label: string): string {
  const s = label.toLowerCase();
  // For combos, key by the goal half so we don't repeat "& Over 2.5" every pick
  if (/&/.test(s)) {
    if (/over\s*2\.?5/.test(s)) return "combo_over25";
    if (/over\s*1\.?5/.test(s)) return "combo_over15";
    if (/under\s*2\.?5/.test(s)) return "combo_under25";
    if (/under\s*3\.?5/.test(s)) return "combo_under35";
    if (/btts/.test(s)) return "combo_btts";
    return "combo";
  }
  if (/home/.test(s)) return "home";
  if (/away/.test(s)) return "away";
  if (/draw/.test(s)) return "draw";
  if (/btts|gg|ng/.test(s)) return "btts";
  if (/over/.test(s)) return "over";
  if (/under/.test(s)) return "under";
  return s;
}

/**
 * Top-K most likely correct scores via Poisson, derived from predicted xG.
 */
function topScores(p: Pred, k = 3): string[] {
  const m = (p.predicted_score || "").trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const homeXg = m ? Math.max(0.4, parseInt(m[1], 10) * 0.85 + 0.2) : Math.max(0.5, (p.home_win ?? 40) / 30);
  const awayXg = m ? Math.max(0.3, parseInt(m[2], 10) * 0.85 + 0.15) : Math.max(0.4, (p.away_win ?? 30) / 30);
  const scores: { s: string; pr: number }[] = [];
  for (let h = 0; h <= 5; h++) for (let a = 0; a <= 5; a++) {
    scores.push({ s: `${h}-${a}`, pr: poissonProb(homeXg, h) * poissonProb(awayXg, a) });
  }
  scores.sort((x, y) => y.pr - x.pr);
  return scores.slice(0, k).map((x) => x.s);
}

/**
 * Risk of the Day: choose up to 2 Premium-pool matches where Draw is unlikely
 * (low draw %), so the safest "no-draw" combo "1/3 (Home or Away)" applies.
 * Returns matches sorted by combined Home+Away win probability.
 */
function pickRiskMatches(pool: Pred[], limit = 2): Pred[] {
  return pool
    .filter((p) => {
      const dr = p.draw ?? 33;
      const hw = p.home_win ?? 33;
      const aw = p.away_win ?? 33;
      return dr <= 25 && (hw + aw) >= 70;
    })
    .sort((a, b) => {
      const aSum = (a.home_win ?? 0) + (a.away_win ?? 0);
      const bSum = (b.home_win ?? 0) + (b.away_win ?? 0);
      return bSum - aSum;
    })
    .slice(0, limit);
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

    // Always wipe today's AI tips first (categories 'ai_daily' and 'ai_pro').
    // Admin tips ('standard' / 'risk_of_day' / 'diamond_pick') are NEVER touched.
    const { data: toDel } = await supabase
      .from("tips")
      .select("id")
      .eq("tip_date", date)
      .in("category", ["ai_daily", "ai_pro", "ai_premium", "risk_of_day", "diamond_pick"]);
    const delIds = (toDel ?? []).map((t: any) => t.id);
    if (delIds.length > 0) {
      await supabase.from("tips").delete().in("id", delIds);
    }

    // Fetch today's AI predictions
    const baseCols = "id,match_id,home_team,away_team,league,match_date,match_time,prediction,confidence,consensus_odds,variance_stable,predicted_score,home_win,draw,away_win";
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
    const created: Array<{ tier: string; category: string; pick: string; odds: number; confidence: number }> = [];

    // Targets:
    //   Daily Tips page (category='ai_daily'):
    //     - up to 3 Free picks (tier='free', scaled to pool size)
    //     - 1 Pro pick (tier='daily', sourced from Pro pool)
    //     - 1 Premium pick (tier='daily', sourced from Premium pool)
    //   Pro Insights page (category='ai_pro'):
    //     - 3-4 Pro picks (tier='exclusive', sourced from Pro+Premium pools)
    // PREMIUM ISOLATION: matches in premiumPool (conf>=78) belong ONLY on /premium-analysis.
    // Daily Free + Pro Insights must NOT include them.
    const freeTarget = freePool.length >= 8 ? 3 : (freePool.length >= 4 ? 2 : 1);
    const proInsightsPool = proPool;
    const proInsightsTarget = proInsightsPool.length >= 6 ? 5 : (proInsightsPool.length >= 3 ? 4 : Math.min(2, proInsightsPool.length));
    const premiumComboPool = premiumPool;
    // Premium picks: hard cap at 5 per day to keep the page focused on the
    // very best signals (prevents overwhelming users when many matches qualify).
    const premiumComboTarget =
      premiumComboPool.length >= 5 ? 5 :
      Math.min(premiumComboPool.length, 5);

    type TierJob = { name: string; pool: Pred[]; tier: string; count: number; category: string };
    const jobs: TierJob[] = [
      // Daily page: only Free-tier teaser picks (3 free, no Pro/Premium leak)
      { name: "Free",         pool: freePool,         tier: "free",      count: freeTarget,         category: "ai_daily" },
      // Pro Insights: pro-only matches (no premium leak)
      { name: "ProInsights",  pool: proInsightsPool,  tier: "exclusive", count: proInsightsTarget,  category: "ai_pro"   },
      // Premium Insights: ONLY premium-pool matches with combo markets
      { name: "PremiumCombo", pool: premiumComboPool, tier: "premium",   count: premiumComboTarget, category: "ai_premium" },
    ];

    for (const job of jobs) {
      let candidatePool = job.pool;
      if (candidatePool.length === 0) continue;

      for (let n = 0; n < job.count; n++) {
        const picker =
          job.category === "ai_premium" ? pickSafeCombo :
          job.category === "ai_pro" ? pickSafeMarketPro :
          pickSafeMarket;
        const choice = pickBestForTier(candidatePool, usedMatchIds, usedMarketTypes, picker);
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
          category: job.category,
          tip_date: date,
          match_id: p.match_id,
          match_time: p.match_time ?? null,
          match_date: p.match_date ?? date,
        });
        if (insErr) throw insErr;

        usedMatchIds.add(p.match_id);
        usedMarketTypes.add(marketDiversityKey(market.label));
        created.push({ tier: job.tier, category: job.category, pick: `${p.home_team} vs ${p.away_team} — ${market.label}`, odds: market.odds, confidence: p.confidence });
      }
      // Reset diversity tracker per page so Pro Insights doesn't inherit "used" market types from Daily.
      if (job.name === "Free") usedMarketTypes.clear();
      if (job.name === "ProInsights") { usedMarketTypes.clear(); usedMatchIds.clear(); }
    }

    // ---- Risk of the Day: up to 2 safest "no-draw" Premium matches ----
    const riskCandidates = pickRiskMatches(premiumPool, 2);
    const riskUsedMatchIds = new Set<string>();
    for (const p of riskCandidates) {
      const hw = p.home_win ?? 33;
      const aw = p.away_win ?? 33;
      const prob = Math.min(95, hw + aw);
      const odds = Math.max(1.20, Math.round((100 / prob) * 0.92 * 100) / 100);
      const scores = topScores(p, 3).join(", ");
      const { error: riskErr } = await supabase.from("tips").insert({
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league ?? "",
        prediction: "1/3 Correct Scores",
        ai_prediction: scores,
        odds: Math.round(odds * 100) / 100,
        confidence: p.confidence,
        tier: "exclusive",
        status: "published",
        category: "risk_of_day",
        tip_date: date,
        match_id: p.match_id,
        match_time: p.match_time ?? null,
        match_date: p.match_date ?? date,
      });
      if (riskErr) throw riskErr;
      riskUsedMatchIds.add(p.match_id);
      created.push({
        tier: "exclusive",
        category: "risk_of_day",
        pick: `${p.home_team} vs ${p.away_team} — 1/3 [${scores}]`,
        odds,
        confidence: p.confidence,
      });
    }

    // ---- Risk of the Day extension: up to 4 single Correct Score picks from Pro pool ----
    // Pro pool (conf 65–77) frequently lands tight scores like 2-1 / 1-2.
    // We pick the highest-confidence Pro matches with a clear favorite (low draw, decisive
    // xG split) and emit ONE Correct Score tip per match using the top Poisson score.
    const proRiskPool = proPool
      .filter((p) => !riskUsedMatchIds.has(p.match_id))
      .filter((p) => {
        const dr = p.draw ?? 33;
        const hw = p.home_win ?? 33;
        const aw = p.away_win ?? 33;
        return dr <= 30 && Math.max(hw, aw) >= 40;
      })
      .slice()
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

    const PRO_RISK_LIMIT = 4;
    const usedScores = new Set<string>();
    let proRiskCount = 0;
    for (const p of proRiskPool) {
      if (proRiskCount >= PRO_RISK_LIMIT) break;
      const top = topScores(p, 3);
      // Pick the most likely score that hasn't been used yet (diversity across the section)
      const score = top.find((s) => !usedScores.has(s)) ?? top[0];
      if (!score) continue;

      // Approx probability: dampened share of top score vs full Poisson grid.
      // We keep odds in a believable Correct Score range (5.50 – 12.00).
      const baseProb = Math.max(8, Math.min(20, 14 - (p.confidence - 65) * 0.3));
      const odds = Math.max(5.50, Math.min(12.0, Math.round((100 / baseProb) * 100) / 100));

      const { error: proRiskErr } = await supabase.from("tips").insert({
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league ?? "",
        prediction: `Correct Score ${score}`,
        ai_prediction: top.join(", "),
        odds,
        confidence: p.confidence,
        tier: "exclusive",
        status: "published",
        category: "risk_of_day",
        tip_date: date,
        match_id: p.match_id,
        match_time: p.match_time ?? null,
        match_date: p.match_date ?? date,
      });
      if (proRiskErr) throw proRiskErr;
      usedScores.add(score);
      riskUsedMatchIds.add(p.match_id);
      proRiskCount++;
      created.push({
        tier: "exclusive",
        category: "risk_of_day",
        pick: `${p.home_team} vs ${p.away_team} — Correct Score ${score}`,
        odds,
        confidence: p.confidence,
      });
    }

    // ---- Diamond Picks: up to 2 strongest signals (conf >= 88) with SAFE COMBO ----
    const diamondPool = premiumPool
      .filter((p) => (p.confidence ?? 0) >= 88)
      .slice()
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    const diamondAvoid = new Set<string>();
    let diamondCount = 0;
    for (const p of diamondPool) {
      if (diamondCount >= 2) break;
      const combo = pickSafeCombo(p, diamondAvoid);
      if (!combo) continue;
      const scores = topScores(p, 3).join(", ");
      const { error: dErr } = await supabase.from("tips").insert({
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league ?? "",
        prediction: combo.label,
        ai_prediction: scores,
        odds: Math.round(combo.odds * 100) / 100,
        confidence: p.confidence,
        tier: "premium",
        status: "published",
        category: "diamond_pick",
        tip_date: date,
        match_id: p.match_id,
        match_time: p.match_time ?? null,
        match_date: p.match_date ?? date,
      });
      if (dErr) throw dErr;
      diamondAvoid.add(marketDiversityKey(combo.label));
      diamondCount++;
      created.push({
        tier: "premium",
        category: "diamond_pick",
        pick: `${p.home_team} vs ${p.away_team} — ${combo.label} [${scores}]`,
        odds: combo.odds,
        confidence: p.confidence,
      });
    }

    // ---- Single consolidated AI summary push ----
    if (created.length > 0) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
          },
          body: JSON.stringify({
            type: "summary",
            summary: {
              title: "🤖 Today's AI Picks Are In",
              body: `${created.length} new AI predictions ready — Daily, Pro, Premium & more. Tap to view!`,
              nav_path: "/daily-tips",
              collapse_id: `ai_tips_summary_${date}`,
            },
          }),
        });
      } catch (e) {
        console.error("[generate-ai-tips] summary push failed:", e);
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