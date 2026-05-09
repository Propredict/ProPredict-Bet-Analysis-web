import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * AI Ticket Generator
 *
 * Daily tickets (tier='daily', category='ai_daily'):
 *   - 1 ticket/day, or 2 if Free pool > 15
 *   - Combo: 4–6 picks, total odds [2.0, 6.0] (Free first, Pro fallback, NO Premium)
 *   - Single fallback: odds [2.5, 4.0]
 *
 * Pro ticket (tier='pro', category='ai_pro'):
 *   - 1 ticket/day from Pro pool (confidence 65–77)
 *   - Combo: 3–7 picks, total odds [3.0, 10.0]
 *   - All prediction types allowed EXCEPT correct score (e.g. "2-1", "1:0")
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
  is_premium: boolean | null;
  predicted_score: string | null;
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
  market_odds?: Record<string, number> | null;
};

function todayBelgrade(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

function pickOdds(p: Pred): number | null {
  if (p.consensus_odds && p.consensus_odds > 1.05) return Number(p.consensus_odds);
  // fallback from confidence
  if (p.confidence > 0) return Math.max(1.1, Math.round((100 / p.confidence) * 100) / 100);
  return null;
}

/**
 * Market odds calibration.
 * `consensus_odds` in DB is ONLY the 1X2 (Match Winner) consensus — it must
 * NOT be used as the price for Over/Under, GG/NG or BTTS markets.
 *
 * For non-1X2 markets we derive a realistic price from the predicted scoreline
 * (total goals + per-team goals). Ranges mirror typical bookmaker pricing.
 * Returns null when the prediction text doesn't map to a known market and
 * a calibrated price cannot be produced.
 */
function calibratedMarketOdds(prediction: string, predictedScore: string | null): number | null {
  const raw = (prediction || "").trim();
  if (!raw) return null;
  const s = raw.toLowerCase();

  const ps = (predictedScore || "").trim();
  const m = ps.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const hg = m ? parseInt(m[1], 10) : -1;
  const ag = m ? parseInt(m[2], 10) : -1;
  const total = hg >= 0 ? hg + ag : -1;

  // Over X.5 family
  if (/over\s*2\.?5/.test(s)) {
    if (total < 0) return null;
    if (total >= 5) return 1.25;
    if (total === 4) return 1.42;
    if (total === 3) return 1.65;
    if (total === 2) return 2.50;
    return 4.20; // total <= 1
  }
  if (/under\s*2\.?5/.test(s)) {
    if (total < 0) return null;
    if (total <= 1) return 1.28;
    if (total === 2) return 1.55;
    if (total === 3) return 2.40;
    if (total === 4) return 4.20;
    return 6.00;
  }
  if (/over\s*3\.?5/.test(s)) {
    if (total < 0) return null;
    if (total >= 5) return 1.55;
    if (total === 4) return 2.10;
    if (total === 3) return 3.40;
    return 5.50;
  }
  if (/under\s*3\.?5/.test(s)) {
    if (total < 0) return null;
    if (total <= 2) return 1.25;
    if (total === 3) return 1.45;
    if (total === 4) return 2.10;
    return 4.50;
  }
  if (/over\s*1\.?5/.test(s)) {
    if (total < 0) return null;
    if (total >= 3) return 1.20;
    if (total === 2) return 1.45;
    return 2.80;
  }
  if (/under\s*1\.?5/.test(s)) {
    if (total < 0) return null;
    if (total <= 1) return 1.55;
    if (total === 2) return 2.80;
    return 5.00;
  }

  // BTTS / GG / NG
  if (/^gg\b/.test(s) || /btts\s*yes/.test(s) || /both\s*teams\s*(to\s*)?score/.test(s)) {
    if (hg < 0 || ag < 0) return null;
    if (hg >= 2 && ag >= 2) return 1.38;
    if (hg >= 1 && ag >= 1) return 1.65;
    return 3.20; // one team predicted to keep clean sheet
  }
  if (/^ng\b/.test(s) || /btts\s*no/.test(s)) {
    if (hg < 0 || ag < 0) return null;
    if (hg === 0 || ag === 0) return 1.50;
    if (hg >= 2 && ag >= 2) return 3.50;
    return 2.20;
  }

  // 1X2 / Double Chance / DNB → return null so caller falls back to consensus_odds.
  return null;
}

/**
 * Reject ticket picks where the market label contradicts the predicted score.
 * Example: "BTTS Yes" must never appear when the AI score is 0-2.
 */
function predictionMatchesPredictedScore(prediction: string, predictedScore: string | null): boolean {
  const raw = (prediction || "").trim();
  if (!raw || !predictedScore) return true;

  const s = raw.toLowerCase();
  const m = predictedScore.trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  if (!m) return true;

  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  const total = hg + ag;

  if ((/^gg\b/.test(s) || /btts\s*yes/.test(s) || /both\s*teams\s*(to\s*)?score/.test(s)) && (hg === 0 || ag === 0)) return false;
  if ((/^ng\b/.test(s) || /btts\s*no/.test(s)) && hg > 0 && ag > 0) return false;
  if (/over\s*1\.?5/.test(s) && total <= 1) return false;
  if (/under\s*1\.?5/.test(s) && total >= 2) return false;
  if (/over\s*2\.?5/.test(s) && total <= 2) return false;
  if (/under\s*2\.?5/.test(s) && total >= 3) return false;
  if (/over\s*3\.?5/.test(s) && total <= 3) return false;
  if (/under\s*3\.?5/.test(s) && total >= 4) return false;
  if ((s === "1" || s.includes("home win")) && hg <= ag) return false;
  if ((s === "2" || s.includes("away win")) && ag <= hg) return false;
  if ((s === "x" || s === "draw") && hg !== ag) return false;

  return true;
}

/**
 * Map a prediction label to a key in the `market_odds` jsonb (real bookmaker
 * consensus captured by snapshot-odds). Returns null for 1X2 (handled separately).
 */
function marketOddsKey(prediction: string): string | null {
  const s = (prediction || "").toLowerCase().trim();
  if (/over\s*1\.?5/.test(s)) return "over_1_5";
  if (/under\s*1\.?5/.test(s)) return "under_1_5";
  if (/over\s*2\.?5/.test(s)) return "over_2_5";
  if (/under\s*2\.?5/.test(s)) return "under_2_5";
  if (/over\s*3\.?5/.test(s)) return "over_3_5";
  if (/under\s*3\.?5/.test(s)) return "under_3_5";
  if (/^gg\b/.test(s) || /btts\s*yes/.test(s) || /both\s*teams\s*(to\s*)?score/.test(s)) return "btts_yes";
  if (/^ng\b/.test(s) || /btts\s*no/.test(s)) return "btts_no";
  return null;
}

/**
 * Returns the BEST realistic price for `p.prediction`:
 *  - For non-1X2 markets (Over/Under, GG/NG, BTTS) → calibrated from predicted_score.
 *  - For 1X2 → consensus_odds (real bookmaker average for Match Winner).
 * Falls back to legacy pickOdds() only if neither path yields a value.
 */
function realPickOdds(p: Pred): number | null {
  if (!predictionMatchesPredictedScore(p.prediction, p.predicted_score)) return null;
  // 1) Prefer REAL bookmaker consensus from market_odds (snapshot-odds cron).
  const key = marketOddsKey(p.prediction);
  if (key && p.market_odds && typeof p.market_odds[key] === "number" && p.market_odds[key] > 1.05) {
    return Number(p.market_odds[key]);
  }
  // 2) Otherwise calibrate non-1X2 markets from predicted score.
  const calibrated = calibratedMarketOdds(p.prediction, p.predicted_score);
  if (calibrated !== null) return calibrated;
  // 3) Fallback to 1X2 consensus / confidence-derived odds.
  return pickOdds(p);
}

function poissonProb(lambda: number, k: number): number {
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) result *= lambda / i;
  return result;
}

function clampProb(n: number, min = 5, max = 95): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function displayGoalMarketProbs(p: Pred) {
  const m = (p.predicted_score || "").trim().match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const homeXg = m ? Math.max(0.4, parseInt(m[1], 10) * 0.85 + 0.2) : Math.max(0.5, (p.home_win ?? 40) / 30);
  const awayXg = m ? Math.max(0.3, parseInt(m[2], 10) * 0.85 + 0.15) : Math.max(0.4, (p.away_win ?? 30) / 30);
  let over15 = 0, over25 = 0, over35 = 0, bttsYes = 0;
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) {
    const prob = poissonProb(homeXg, h) * poissonProb(awayXg, a);
    const total = h + a;
    if (total > 1) over15 += prob;
    if (total > 2) over25 += prob;
    if (total > 3) over35 += prob;
    if (h > 0 && a > 0) bttsYes += prob;
  }
  let o15 = clampProb(over15 * 100), o25 = clampProb(over25 * 100), o35 = clampProb(over35 * 100), by = clampProb(bttsYes * 100);
  const totalXg = homeXg + awayXg;
  if (totalXg >= 2.8 && homeXg >= 1.2 && awayXg >= 1.0) { o25 = Math.max(o25, 58); by = Math.max(by, 55); }
  if (totalXg >= 3.2) { o25 = Math.max(o25, 65); o35 = Math.max(o35, 40); }
  if (homeXg >= 1.3 && awayXg >= 1.1) by = Math.max(by, 55);
  if (totalXg < 1.8) { o25 = Math.min(o25, 35); by = Math.min(by, 38); }
  return { over15: o15, over25: o25, over35: o35, under25: clampProb(100 - o25), bttsYes: by, bttsNo: clampProb(100 - by) };
}

/** Mirror the AI Predictions "Best Pick" label so tickets don't show a stale/raw market like BTTS when the card shows another pick. */
function displayedTicketPrediction(p: Pred): string {
  let hw = Math.max(5, p.home_win ?? 33), aw = Math.max(5, p.away_win ?? 33), d = Math.max(5, p.draw ?? 34);
  const total = hw + aw + d;
  hw = Math.round((hw / total) * 100); aw = Math.round((aw / total) * 100); d = 100 - hw - aw;
  const g = displayGoalMarketProbs(p);
  const dcEligible = Math.max(hw, aw, d) < 60;
  const candidates = [
    { label: "Home Win", prob: hw + 8 }, { label: "Away Win", prob: aw + 8 }, { label: "Draw", prob: d + 8 },
    { label: "1X", prob: dcEligible && hw + d >= 80 ? hw + d - 4 : 0 },
    { label: "X2", prob: dcEligible && d + aw >= 80 ? d + aw - 4 : 0 },
    { label: "12", prob: dcEligible && hw + aw >= 80 ? hw + aw - 4 : 0 },
    { label: "Over 1.5", prob: g.over15 >= 80 ? g.over15 - 6 : 0 },
    { label: "Over 2.5", prob: g.over25 }, { label: "Over 3.5", prob: g.over35 >= 60 ? g.over35 : 0 },
    { label: "Under 2.5", prob: g.under25 }, { label: "BTTS Yes", prob: g.bttsYes }, { label: "BTTS No", prob: g.bttsNo },
  ];
  candidates.sort((a, b) => b.prob - a.prob);
  return candidates[0]?.prob > 0 ? candidates[0].label : normalizePredictionLabel(p.prediction);
}

/**
 * Normalize an AI prediction label to a clean, user-friendly market name.
 * "1" -> "Home Win", "X" -> "Draw", "2" -> "Away Win", keeps everything else as-is.
 */
function normalizePredictionLabel(prediction: string): string {
  const s = (prediction || "").trim();
  if (s === "1") return "Home Win";
  if (s === "X" || s.toLowerCase() === "x") return "Draw";
  if (s === "2") return "Away Win";
  return s;
}

/**
 * Compute realistic odds for an arbitrary market label (as shown on the
 * AI Prediction card). Mirrors realPickOdds but uses the displayed label.
 */
function oddsForLabel(p: Pred, label: string): number | null {
  const tmp: Pred = { ...p, prediction: label };
  if (!predictionMatchesPredictedScore(label, p.predicted_score)) return null;
  const key = marketOddsKey(label);
  if (key && p.market_odds && typeof p.market_odds[key] === "number" && p.market_odds[key] > 1.05) {
    return Number(p.market_odds[key]);
  }
  const calibrated = calibratedMarketOdds(label, p.predicted_score);
  if (calibrated !== null) return calibrated;
  // 1X2 / DC fallback uses match-winner consensus
  return pickOdds(tmp);
}

/**
 * Single source of truth for the ticket pick: use the SAME market that the
 * AI Predictions card displays as "Best Pick" (displayedTicketPrediction),
 * and compute the appropriate odds for that market.
 */
function aiDisplayedPick(p: Pred): MarketChoice | null {
  const label = displayedTicketPrediction(p);
  if (!label) return null;
  if (isCorrectScore(label)) return null;
  const odds = oddsForLabel(p, label);
  if (odds === null) return null;
  return { market: label, odds, prob: p.confidence || 0 };
}

/**
 * Pro pick: ALWAYS use the AI's original prediction with its real odds.
 * No derived "Double Chance" / "12 (No Draw)" markets — only what AI actually
 * predicted (1, X, 2, Over 2.5, GG, etc.). Correct scores are excluded.
 */
function originalProPick(p: Pred): MarketChoice | null {
  // Use the AI Prediction "Best Pick" (same label shown on the card).
  return aiDisplayedPick(p);
}

/**
 * Premium Smart Combo pick: mirrors the "Smart Combos" tab in AI Predictions.
 * Builds a real combo market like "Home Win & Over 1.5" / "Home Win & Over 2.5"
 * / "Away Win & Over 2.5" / "GG & Over 2.5" using the AI's main 1X2 prediction
 * and the predicted score from the Premium prediction itself.
 *
 * Falls back to the AI's original prediction when no combo can be built.
 */
function premiumComboPick(p: Pred): MarketChoice | null {
  // Premium tickets must reflect the same Best Pick shown on the AI card —
  // no derived combo markets like "Home Win & Over 2.5".
  return aiDisplayedPick(p);
}

/**
 * Evaluate ALL safe markets for a pick and return the one with the highest
 * probability above the safety threshold. Considers:
 *   1X2: "Home Win" / "Draw" / "Away Win"
 *   Double Chance: "1X" / "X2" / "12"
 *   Goals: "Over 2.5" / "Under 2.5" / "Over 3.5"
 *   BTTS: "GG" / "NG"
 *
 * Probabilities for 1X2 come from predicted home_win/draw/away_win.
 * Probabilities for goals/BTTS are estimated from predicted_score.
 * Returns market label + computed odds (1/prob with safety cap).
 */
type MarketChoice = { market: string; odds: number; prob: number };

function clampOdds(prob: number): number {
  // prob is in 0-100; convert to decimal odds with small bookmaker margin
  const fair = 100 / Math.max(prob, 1);
  const o = Math.max(1.15, Math.min(2.6, fair * 0.95));
  return Math.round(o * 100) / 100;
}

function safestProPick(p: Pred): MarketChoice {
  const hw = p.home_win ?? 0;
  const dr = p.draw ?? 0;
  const aw = p.away_win ?? 0;

  const ps = (p.predicted_score || "").trim();
  const m = ps.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const hg = m ? parseInt(m[1], 10) : -1;
  const ag = m ? parseInt(m[2], 10) : -1;
  const total = hg >= 0 ? hg + ag : -1;

  const candidates: { market: string; prob: number }[] = [];

  // 1X2 (only when we have probabilities)
  if (hw > 0 || dr > 0 || aw > 0) {
    candidates.push({ market: "Home Win", prob: hw });
    candidates.push({ market: "Draw", prob: dr });
    candidates.push({ market: "Away Win", prob: aw });
    candidates.push({ market: "1X (Home or Draw)", prob: hw + dr });
    candidates.push({ market: "X2 (Draw or Away)", prob: dr + aw });
    candidates.push({ market: "12 (No Draw)", prob: hw + aw });
  }

  // Goals & BTTS estimated from predicted score
  if (total >= 0) {
    let over25 = 20, under25 = 20, over35 = 15, gg = 25, ng = 25;
    if (total >= 4) { over25 = 82; under25 = 12; }
    else if (total === 3) { over25 = 72; under25 = 28; }
    else if (total === 2) { over25 = 38; under25 = 70; }
    else { over25 = 18; under25 = 82; }

    if (total >= 5) over35 = 80;
    else if (total === 4) over35 = 65;
    else if (total === 3) over35 = 32;
    else over35 = 15;

    if (hg >= 2 && ag >= 2) { gg = 82; ng = 18; }
    else if (hg >= 1 && ag >= 1) { gg = 72; ng = 28; }
    else { gg = 22; ng = 78; }

    candidates.push({ market: "Over 2.5", prob: over25 });
    candidates.push({ market: "Under 2.5", prob: under25 });
    candidates.push({ market: "Over 3.5", prob: over35 });
    candidates.push({ market: "GG", prob: gg });
    candidates.push({ market: "NG", prob: ng });
  }

  // Choose highest probability above safety threshold (65%)
  const safe = candidates.filter((c) => c.prob >= 65).sort((a, b) => b.prob - a.prob);
  if (safe.length > 0) {
    const best = safe[0];
    // Prefer calibrated market odds (real bookmaker prices) over prob-based estimate.
    const calibrated = calibratedMarketOdds(best.market, p.predicted_score);
    const consensus = pickOdds(p);
    let odds: number;
    if (calibrated != null) odds = calibrated;
    else if (/^(home win|away win|draw|1x|x2|12)/i.test(best.market) && consensus) odds = consensus;
    else odds = clampOdds(best.prob);
    return { market: best.market, odds, prob: best.prob };
  }

  // Fallback: keep original AI prediction with its odds (unless correct score)
  const original = (p.prediction || "").trim();
  const fallbackOdds = pickOdds(p) ?? 1.5;
  if (isCorrectScore(original)) {
    // Pick the better double chance from probabilities
    const dc = [
      { market: "1X (Home or Draw)", prob: hw + dr },
      { market: "X2 (Draw or Away)", prob: dr + aw },
      { market: "12 (No Draw)", prob: hw + aw },
    ].sort((a, b) => b.prob - a.prob)[0];
    return { market: dc.market, odds: clampOdds(Math.max(dc.prob, 60)), prob: dc.prob };
  }
  return { market: original, odds: fallbackOdds, prob: 0 };
}

/** Detect "correct score"-style predictions like "2-1", "1:0", "Score 3-2". */
function isCorrectScore(prediction: string): boolean {
  const s = (prediction || "").toLowerCase();
  if (/\b\d{1,2}\s*[-:]\s*\d{1,2}\b/.test(s)) return true;
  if (s.includes("correct score") || s.includes("exact score")) return true;
  return false;
}

function buildCombo(pool: Pred[], excludeMatchIds: Set<string> = new Set()): { picks: Pred[]; total: number } | null {
  // Greedy: iterate pool in caller-provided priority order.
  // Caller must pre-sort (e.g. Free first, then Pro).
  const sorted = pool;
  const usedMatchIds = new Set<string>();
  const chosen: Pred[] = [];
  let total = 1;

  for (const p of sorted) {
    if (chosen.length >= 6) break;
    if (usedMatchIds.has(p.match_id) || excludeMatchIds.has(p.match_id)) continue;
    const o = realPickOdds(p);
    if (!o) continue;
    // Avoid single-pick odds that are too high in a combo
    if (o > 2.2) continue;
    const next = total * o;
    if (next > 6.0) continue; // would overshoot
    chosen.push(p);
    usedMatchIds.add(p.match_id);
    total = next;
    if (chosen.length >= 4 && total >= 2.0) {
      // valid combo reached; keep adding only if it stays ≤ 6
    }
  }

  if (chosen.length >= 4 && total >= 2.0 && total <= 6.0) {
    return { picks: chosen, total: Math.round(total * 100) / 100 };
  }
  return null;
}

/**
 * Pro combo builder.
 *  - 3–7 picks, total odds in [3.0, 10.0]
 *  - Per-pick odds capped at 2.6 to keep combo "safe"
 *  - Excludes correct-score predictions
 *  - Caller pre-sorts pool (confidence DESC) and may exclude match IDs
 */
function buildProCombo(
  pool: Pred[],
  excludeMatchIds: Set<string> = new Set(),
): { picks: { p: Pred; choice: MarketChoice }[]; total: number } | null {
  const usedMatchIds = new Set<string>();
  const chosen: { p: Pred; choice: MarketChoice }[] = [];
  let total = 1;

  for (const p of pool) {
    if (chosen.length >= 7) break;
    if (usedMatchIds.has(p.match_id) || excludeMatchIds.has(p.match_id)) continue;
    const choice = originalProPick(p);
    if (!choice) continue; // skips correct-score predictions
    // Require at least Pro-tier confidence on the AI's own prediction
    if (choice.prob < 65) continue;
    const o = choice.odds;
    if (o < 1.2 || o > 2.6) continue;
    const next = total * o;
    if (next > 10.0) continue;
    chosen.push({ p, choice });
    usedMatchIds.add(p.match_id);
    total = next;
    // Stop early once we are inside the safe sweet spot with enough picks
    if (chosen.length >= 5 && total >= 4.0) break;
  }

  if (chosen.length >= 3 && total >= 3.0 && total <= 10.0) {
    return { picks: chosen, total: Math.round(total * 100) / 100 };
  }
  return null;
}

/**
 * Premium combo builder.
 *  - 4–6 picks, total odds in [5.0, 15.0]
 *  - Composition: ~60% Premium picks + ~40% Pro picks (mix for higher payout)
 *  - Per-pick odds in [1.25, 3.0]
 *  - Excludes correct-score predictions; uses safestProPick for safe markets
 *  - Allows higher individual odds than Pro tickets (e.g. "1 + Over 3.5")
 */
function buildPremiumCombo(
  premiumOrdered: Pred[],
  proOrdered: Pred[],
  excludeMatchIds: Set<string> = new Set(),
): { picks: { p: Pred; choice: MarketChoice }[]; total: number } | null {
  // Target: 4–5 picks, mostly from the Top AI Premium picks; if Premium pool
  // can't supply enough qualifying picks, top up with the strongest Pro picks
  // (confidence ≥ 70) so the ticket still ships.
  const used = new Set<string>(excludeMatchIds);
  const chosen: { p: Pred; choice: MarketChoice }[] = [];
  let total = 1;

  const tryAdd = (p: Pred, minConf: number): boolean => {
    if (used.has(p.match_id)) return false;
    if ((p.confidence ?? 0) < minConf) return false;
    const choice = aiDisplayedPick(p);
    if (!choice) return false;
    const o = choice.odds;
    if (o < 1.18 || o > 3.5) return false;
    const next = total * o;
    if (next > 20.0) return false;
    chosen.push({ p, choice });
    used.add(p.match_id);
    total = next;
    return true;
  };

  // Phase 1 — top Premium picks (≥78). Take up to 5.
  for (const p of premiumOrdered) {
    if (chosen.length >= 5) break;
    tryAdd(p, 78);
  }

  // Phase 2 — fill missing slots from strong Pro picks (≥70).
  if (chosen.length < 4) {
    for (const p of proOrdered) {
      if (chosen.length >= 5) break;
      tryAdd(p, 70);
    }
  }

  // Phase 3 — last-resort relax to ≥65 if still short.
  if (chosen.length < 4) {
    for (const p of proOrdered) {
      if (chosen.length >= 4) break;
      tryAdd(p, 65);
    }
  }

  // Accept 4 or 5 picks; total odds in a generous [2.5, 20] range.
  if (chosen.length >= 4 && chosen.length <= 5 && total >= 2.5 && total <= 20.0) {
    return { picks: chosen, total: Math.round(total * 100) / 100 };
  }
  return null;
}

/**
 * Elite Top-Picks Combo (extra Premium ticket).
 * Mirrors the "Top AI Picks Today" selection in the Premium AI tab:
 *   - Only Tier 1 / Tier 2 leagues, confidence ≥ 78
 *   - Variance must be stable
 *   - Cherry-picks the 4–5 strongest predictions for one combined ticket
 *   - Per-pick odds in [1.25, 3.5], total odds in [4.0, 18.0]
 */
const TIER1_LEAGUE_FRAGMENTS = [
  "premier league", "la liga", "bundesliga", "serie a", "ligue 1",
  "champions league", "europa league", "conference league",
  "world cup", "euro championship", "copa america", "copa libertadores",
];
const TIER2_LEAGUE_FRAGMENTS = [
  "primeira liga", "eredivisie", "super lig", "süper lig", "jupiler pro league",
  "scottish premiership", "championship", "la liga 2",
  "segunda división", "segunda division", "2. bundesliga", "serie b", "ligue 2",
  "mls", "brasileirão", "brasileirao", "liga mx",
];
function eliteLeagueTier(league: string | null | undefined): 1 | 2 | 3 {
  const l = (league ?? "").toLowerCase();
  if (!l) return 3;
  if (/\bu1[5-9]\b|\bu2[0-3]\b|reserve|youth/i.test(l)) return 3;
  if (TIER1_LEAGUE_FRAGMENTS.some((n) => l.includes(n))) return 1;
  if (TIER2_LEAGUE_FRAGMENTS.some((n) => l.includes(n))) return 2;
  return 3;
}

function buildElitePremiumCombo(
  premiumOrdered: Pred[],
  excludeMatchIds: Set<string> = new Set(),
): { picks: { p: Pred; choice: MarketChoice }[]; total: number } | null {
  // Cascading buckets — top leagues + highest confidence first.
  const qualified = premiumOrdered.filter(
    (p) => p.variance_stable === true && (p.confidence ?? 0) >= 78,
  );
  const buckets: Pred[][] = [
    qualified.filter((p) => eliteLeagueTier(p.league) === 1 && (p.confidence ?? 0) >= 85),
    qualified.filter((p) => eliteLeagueTier(p.league) === 1 && (p.confidence ?? 0) >= 78 && (p.confidence ?? 0) < 85),
    qualified.filter((p) => eliteLeagueTier(p.league) === 2 && (p.confidence ?? 0) >= 85),
    qualified.filter((p) => eliteLeagueTier(p.league) === 2 && (p.confidence ?? 0) >= 78 && (p.confidence ?? 0) < 85),
    qualified.filter((p) => eliteLeagueTier(p.league) === 3 && (p.confidence ?? 0) >= 85),
  ];

  const used = new Set<string>(excludeMatchIds);
  const chosen: { p: Pred; choice: MarketChoice }[] = [];
  let total = 1;
  const typeCount = new Map<string, number>();

  for (const bucket of buckets) {
    if (chosen.length >= 5) break;
    const ranked = bucket.slice().sort((a, b) => b.confidence - a.confidence);
    for (const p of ranked) {
      if (chosen.length >= 5) break;
      if (used.has(p.match_id)) continue;
      const choice = premiumComboPick(p);
      if (!choice) continue;
      const o = choice.odds;
      if (o < 1.25 || o > 3.5) continue;
      // Diversity cap: max 2 of same market family
      const family = choice.market.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      if ((typeCount.get(family) ?? 0) >= 2) continue;
      const next = total * o;
      if (next > 18.0) continue;
      chosen.push({ p, choice });
      used.add(p.match_id);
      total = next;
      typeCount.set(family, (typeCount.get(family) ?? 0) + 1);
      if (chosen.length >= 4 && total >= 6.0) break;
    }
  }

  if (chosen.length >= 4 && total >= 4.0 && total <= 18.0) {
    return { picks: chosen, total: Math.round(total * 100) / 100 };
  }
  return null;
}

function buildSingle(pool: Pred[], excludeMatchIds: Set<string> = new Set()): { picks: Pred[]; total: number } | null {
  const candidates = pool
    .filter((p) => !excludeMatchIds.has(p.match_id))
    .map((p) => ({ p, o: realPickOdds(p) }))
    .filter((x) => x.o !== null && x.o! >= 2.5 && x.o! <= 4.0)
    .sort((a, b) => b.p.confidence - a.p.confidence);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  return { picks: [top.p], total: Math.round(top.o! * 100) / 100 };
}

/**
 * Multi-Risk combo builder (v2).
 *  - 1, 2 or 3 picks per ticket (small-size, high-odds combos).
 *  - Uses SAFE AI predictions (AI's main prediction or safest market choice)
 *    BUT only when that pick's odds are ≥ 2.50.
 *  - Source: Pro pool (65–77) + Premium pool (≥78); skips Free.
 *  - Excludes raw correct-score predictions (those go through Score Hunter logic
 *    inside `highOddsSafePick` if/when the underlying market odds cross 2.50).
 */
type RiskSize = 2 | 3 | 4;

function correctScoreOdds(predictedScore: string | null): number | null {
  // Approximate market odds for a correct-score bet from the predicted score.
  // Common scorelines have well-known typical odds.
  const ps = (predictedScore || "").trim();
  const m = ps.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  if (!m) return null;
  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  const total = hg + ag;
  // Heuristic odds table
  if (hg === ag && hg <= 1) return 6.5;          // 0-0, 1-1
  if (Math.abs(hg - ag) === 1 && total <= 3) return 7.5; // 1-0, 2-1, 0-1, 1-2
  if (total === 3 || total === 4) return 9.0;    // 2-2, 3-1, 1-3, 3-0
  if (total === 5) return 14.0;                  // 4-1, 3-2, etc.
  if (total >= 6) return 25.0;                   // wild scores
  return 8.0;
}

/**
 * Pick a SAFE market for a prediction whose odds are ≥ 2.50.
 * Strategy:
 *   1) If the AI's primary prediction has odds in [2.50, 6.0] and isn't a
 *      raw correct-score, use it directly (this is the "safe pick at high odds"
 *      case the user described — e.g. "Home Win & Over 2.5" @ 2.70).
 *   2) Otherwise, derive odds from probabilities for 1X2 and from the
 *      predicted score for goals/BTTS markets, and accept the highest-prob
 *      candidate whose computed odds fall in [2.50, 6.0].
 *   3) Optionally allow a correct-score fallback if its heuristic odds fit.
 */
function highOddsSafePick(p: Pred): MarketChoice | null {
  // Risk picks must also follow the AI Prediction Best Pick.
  // Path A: use displayed pick if its odds are ≥ 2.50 (AI backs underdog).
  const displayed = aiDisplayedPick(p);
  if (displayed && displayed.odds >= 2.5 && displayed.odds <= 6.0) {
    return displayed;
  }

  // Path B: high-confidence Correct Score punt (only when displayed pick
  // doesn't qualify and AI score is reliable).
  if ((p.confidence ?? 0) >= 75 && p.predicted_score) {
    const csOdds = correctScoreOdds(p.predicted_score);
    if (csOdds !== null && csOdds >= 2.5 && csOdds <= 14.0) {
      return {
        market: `Correct Score ${p.predicted_score.replace(/\s+/g, "")}`,
        odds: csOdds,
        prob: p.confidence || 0,
      };
    }
  }

  return null;
}

function buildRiskCombo(
  premiumOrdered: Pred[],
  proOrdered: Pred[],
  excludeMatchIds: Set<string>,
  size: RiskSize,
): { picks: { p: Pred; market: string; odds: number }[]; total: number; size: RiskSize } | null {
  const used = new Set<string>();
  const chosen: { p: Pred; market: string; odds: number }[] = [];
  let total = 1;

  for (const p of [...premiumOrdered, ...proOrdered]) {
    if (chosen.length >= size) break;
    if (used.has(p.match_id) || excludeMatchIds.has(p.match_id)) continue;
    const pick = highOddsSafePick(p);
    if (!pick) continue;
    // Per-match floor: every single odds must be ≥ 2.50 (≤ 6.0 enforced upstream)
    if (pick.odds < 2.5) continue;
    const next = total * pick.odds;
    // Combined cap: keep risk tickets within a believable range
    if (next > 250) continue;
    chosen.push({ p, market: pick.market, odds: pick.odds });
    used.add(p.match_id);
    total = next;
  }

  if (chosen.length !== size) return null;
  // Risk Ticket: combined odds must be in [4.00, 250.00]
  if (total < 4 || total > 250) return null;
  return { picks: chosen, total: Math.round(total * 100) / 100, size };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const date = todayBelgrade();

    // Optional admin flag: wipe today's AI ticket categories before regenerating.
    // IMPORTANT: Only AI-generated categories (ai_*) are ever wiped.
    // Admin categories ('standard', 'multi_risk') are NEVER touched by this function.
    let body: any = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const wipeCategories: string[] = [];
    if (body?.wipe_premium) wipeCategories.push("ai_premium");
    if (body?.wipe_pro) wipeCategories.push("ai_pro");
    if (body?.wipe_daily) wipeCategories.push("ai_daily");
    if (body?.wipe_all) wipeCategories.push("ai_premium", "ai_pro", "ai_daily");
    if (wipeCategories.length > 0) {
      const { data: toDelete } = await supabase
        .from("tickets")
        .select("id")
        .eq("ticket_date", date)
        .in("category", wipeCategories);
      const ids = (toDelete ?? []).map((t: any) => t.id);
      if (ids.length > 0) {
        await supabase.from("ticket_matches").delete().in("ticket_id", ids);
        await supabase.from("tickets").delete().in("id", ids);
      }
    }

    // Count existing AI daily tickets for today (max 2 per day)
    const { data: existing } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "ai_daily");

    const existingCount = existing?.length ?? 0;
    // NOTE: daily cap (2) is enforced via targetTickets calculation below;
    // we no longer early-return here so Pro/Premium/Risk sections still run
    // even when Daily quota is already met.

    // Fetch today's predictions across all tiers.
    // Tier mapping: Premium ≥ 78, Pro 65–77, Free < 65.
    const baseCols = "id,match_id,home_team,away_team,league,match_date,prediction,confidence,consensus_odds,variance_stable,is_premium,predicted_score,home_win,draw,away_win";
    let preds: any[] | null = null;
    {
      const r1 = await supabase
        .from("ai_predictions")
        .select(`${baseCols},market_odds`)
        .eq("match_date", date)
        .gte("confidence", 50)
        .order("confidence", { ascending: false })
        .limit(120);
      if (r1.error) {
        // market_odds column not yet migrated — fall back to base columns.
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
    }
    const all = (preds ?? []) as Pred[];

    // Split into Free (<65), Pro (65–77), Premium (≥78).
    const freePool = all.filter((p) => p.confidence < 65);
    const proPool = all.filter((p) => p.confidence >= 65 && p.confidence < 78);
    const premiumPool = all.filter((p) => p.confidence >= 78);

    // Strategy: try Free-only first. If not enough for a valid combo, top up with Pro.
    const stableOnly = (arr: Pred[]) => {
      const stable = arr.filter((p) => p.variance_stable);
      return stable.length >= 4 ? stable : arr;
    };
    // Sort each tier internally by confidence DESC, then concatenate (Free always first).
    const byConfDesc = (a: Pred, b: Pred) => b.confidence - a.confidence;
    const freeOrdered = stableOnly(freePool).slice().sort(byConfDesc);
    const proOrdered = stableOnly(proPool).slice().sort(byConfDesc);

    // Decide how many tickets to create:
    //  - Always at least 1
    //  - 2 tickets only if Free pool has > 15 matches (so we have enough Free supply)
    const targetTickets: number = Number.isFinite(body?.daily_target)
      ? Math.max(0, Number(body.daily_target))
      : (freePool.length > 12 ? 3 : (freePool.length > 4 ? 2 : 1));
    // Account for any tickets already created today
    const ticketsToCreate = Math.max(0, targetTickets - existingCount);
    const usedMatchIds = new Set<string>();
    const created: Array<{ id: string; picks: number; total_odds: number; strategy: string }> = [];
    let dailySkipReason: string | null = null;
    if (ticketsToCreate === 0) {
      dailySkipReason = "Daily AI ticket already at target for today";
    }

    for (let i = 0; i < ticketsToCreate; i++) {
      // Try Free-only combo first, then supplement with Pro, then single fallback
      let combo = buildCombo(freeOrdered, usedMatchIds);
      if (!combo) combo = buildCombo([...freeOrdered, ...proOrdered], usedMatchIds);
      if (!combo) combo = buildSingle([...freeOrdered, ...proOrdered], usedMatchIds);
      if (!combo) break; // no more material

      const isCombo = combo.picks.length > 1;
      const ticketIdx = existingCount + i + 1;
      const title = isCombo
        ? `🤖 Daily Combo${targetTickets > 1 ? ` #${ticketIdx}` : ""} • ${combo.picks.length} Picks`
        : `🤖 Daily Pick${targetTickets > 1 ? ` #${ticketIdx}` : ""} • ${combo.picks[0].home_team} vs ${combo.picks[0].away_team}`;

      const { data: newTicket, error: tErr } = await supabase
        .from("tickets")
        .insert({
          title,
          tier: "daily",
          status: "published",
          category: "ai_daily",
          total_odds: combo.total,
          ticket_date: date,
          ai_analysis: `Auto-generated by AI from ${combo.picks.length} prediction(s). Avg confidence: ${Math.round(
            combo.picks.reduce((s, p) => s + p.confidence, 0) / combo.picks.length,
          )}%.`,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      const matchRows = combo.picks.map((p, idx) => ({
        ticket_id: newTicket.id,
        match_name: `${p.home_team} vs ${p.away_team}`,
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league,
        prediction: displayedTicketPrediction(p),
        odds: realPickOdds(p)!,
        match_date: p.match_date,
        sort_order: idx,
      }));

      const { error: mErr } = await supabase.from("ticket_matches").insert(matchRows);
      if (mErr) throw mErr;

      // Mark these matches used so the second ticket cannot reuse them
      combo.picks.forEach((p) => usedMatchIds.add(p.match_id));

      created.push({
        id: newTicket.id,
        picks: combo.picks.length,
        total_odds: combo.total,
        strategy: isCombo ? "combo" : "single",
      });
    }

    // ───────────────────────────────────────────────────────────────────
    // PRO TICKETS (1–2 per day) — only from Pro pool, excludes correct score
    // 2 tickets if Pro pool > 12 (so we have enough material for variety)
    // ───────────────────────────────────────────────────────────────────
    const proCreated: Array<{ id: string; picks: number; total_odds: number }> = [];
    let proSkipReason: string | null = null;

    const { data: existingPro } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "ai_pro");

    const existingProCount = existingPro?.length ?? 0;
    const proTarget: number = Number.isFinite(body?.pro_target)
      ? Math.max(0, Number(body.pro_target))
      : 2;
    const proToCreate = Math.max(0, proTarget - existingProCount);

    if (proToCreate === 0) {
      proSkipReason = existingProCount >= proTarget
        ? "Pro AI ticket already at target for today"
        : "not_attempted";
    } else if (proPool.length < 3) {
      proSkipReason = `Pro pool too small (${proPool.length} < 3)`;
    } else {
      // Pro tickets can mix Pro (65–77) AND Premium (≥78) picks for variety.
      // Premium picks are placed first (higher confidence) but the gate
      // (choice.prob ≥ 65) accepts both tiers.
      const stableProPool = proPool.filter((p) => p.variance_stable);
      const proSource = stableProPool.length >= 3 ? stableProPool : proPool;
      const stablePremForPro = premiumPool.filter((p) => p.variance_stable);
      const premForPro = stablePremForPro.length >= 1 ? stablePremForPro : premiumPool;
      const proOrderedAll = [...premForPro, ...proSource]
        .slice()
        .sort((a, b) => b.confidence - a.confidence);
      const proUsed = new Set<string>();

      for (let i = 0; i < proToCreate; i++) {
        const proCombo = buildProCombo(proOrderedAll, proUsed);
        if (!proCombo) {
          if (proCreated.length === 0) proSkipReason = "No valid Pro combo (odds 3–10, 3–7 picks)";
          break;
        }
        const idx = existingProCount + i + 1;
        const proTitle = `🎯 Pro Combo${proTarget > 1 ? ` #${idx}` : ""} • ${proCombo.picks.length} Picks`;
        const { data: newProTicket, error: ptErr } = await supabase
          .from("tickets")
          .insert({
            title: proTitle,
            // Use 'exclusive' tier so the access layer (canAccess) treats it
            // as Pro/Premium gated content. category 'ai_pro' marks the source.
            tier: "exclusive",
            status: "published",
            category: "ai_pro",
            total_odds: proCombo.total,
            ticket_date: date,
            ai_analysis: `Auto-generated Pro combo from ${proCombo.picks.length} high-confidence picks. Avg confidence: ${Math.round(
              proCombo.picks.reduce((s, x) => s + x.p.confidence, 0) / proCombo.picks.length,
            )}%. Safest market chosen per pick (1/X/2, Double Chance, GG/NG, Over/Under 2.5/3.5 — no correct score).`,
          })
          .select()
          .single();
        if (ptErr) throw ptErr;

        const proRows = proCombo.picks.map((p, k) => ({
          ticket_id: newProTicket.id,
          match_name: `${p.p.home_team} vs ${p.p.away_team}`,
          home_team: p.p.home_team,
          away_team: p.p.away_team,
          league: p.p.league,
          prediction: p.choice.market,
          odds: p.choice.odds,
          match_date: p.p.match_date,
          sort_order: k,
        }));
        const { error: pmErr } = await supabase.from("ticket_matches").insert(proRows);
        if (pmErr) throw pmErr;

        proCombo.picks.forEach((x) => proUsed.add(x.p.match_id));
        proCreated.push({
          id: newProTicket.id,
          picks: proCombo.picks.length,
          total_odds: proCombo.total,
        });
      }
    }

    // ───────────────────────────────────────────────────────────────────
    // PREMIUM TICKETS (2–3 per day) — mix of Premium (≥78) and Pro (65–77)
    //   - 2 default; 3 if premiumPool > 8 AND proPool > 10
    //   - 4–6 picks per ticket; total odds 5–15
    //   - Composition: ~60% Premium picks + ~40% Pro picks
    // ───────────────────────────────────────────────────────────────────
    const premiumCreated: Array<{ id: string; picks: number; total_odds: number }> = [];
    let premiumSkipReason: string | null = null;

    const { data: existingPremium } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "ai_premium");

    const existingPremiumCount = existingPremium?.length ?? 0;
    const premiumTarget: number = Number.isFinite(body?.premium_target)
      ? Math.max(0, Number(body.premium_target))
      : 2;
    const premiumToCreate = Math.max(0, premiumTarget - existingPremiumCount);

    if (premiumToCreate === 0) {
      premiumSkipReason = existingPremiumCount >= premiumTarget
        ? "Premium AI ticket already at target for today"
        : "not_attempted";
    } else if (premiumPool.length < 2) {
      premiumSkipReason = `Premium pool too small (${premiumPool.length} < 2)`;
    } else {
      const stablePremium = premiumPool.filter((p) => p.variance_stable);
      const premiumSource = stablePremium.length >= 2 ? stablePremium : premiumPool;
      const premiumOrderedAll = premiumSource.slice().sort((a, b) => b.confidence - a.confidence);
      const proOrderedForPremium = proPool.slice().sort((a, b) => b.confidence - a.confidence);
      const premiumUsed = new Set<string>();

      for (let i = 0; i < premiumToCreate; i++) {
        const premCombo = buildPremiumCombo(premiumOrderedAll, proOrderedForPremium, premiumUsed);
        if (!premCombo) {
          if (premiumCreated.length === 0)
            premiumSkipReason = "No valid Premium combo (4–6 picks, odds 5–15)";
          break;
        }
        const idx = existingPremiumCount + i + 1;
        const premTitle = `👑 Premium Combo${premiumTarget > 1 ? ` #${idx}` : ""} • ${premCombo.picks.length} Picks`;
        const { data: newPremTicket, error: ptErr } = await supabase
          .from("tickets")
          .insert({
            title: premTitle,
            tier: "premium",
            status: "published",
            category: "ai_premium",
            total_odds: premCombo.total,
            ticket_date: date,
            ai_analysis: `Auto-generated Premium combo. ${premCombo.picks.length} picks (mix of Premium ≥78 and Pro 65–77). Avg confidence: ${Math.round(
              premCombo.picks.reduce((s, x) => s + x.p.confidence, 0) / premCombo.picks.length,
            )}%. Total odds ${premCombo.total.toFixed(2)}x. Markets: 1/X/2, Double Chance, GG/NG, Over/Under 2.5/3.5 (no correct score).`,
          })
          .select()
          .single();
        if (ptErr) throw ptErr;

        const premRows = premCombo.picks.map((p, k) => ({
          ticket_id: newPremTicket.id,
          match_name: `${p.p.home_team} vs ${p.p.away_team}`,
          home_team: p.p.home_team,
          away_team: p.p.away_team,
          league: p.p.league,
          prediction: p.choice.market,
          odds: p.choice.odds,
          match_date: p.p.match_date,
          sort_order: k,
        }));
        const { error: pmErr } = await supabase.from("ticket_matches").insert(premRows);
        if (pmErr) throw pmErr;

        premCombo.picks.forEach((x) => premiumUsed.add(x.p.match_id));
        premiumCreated.push({
          id: newPremTicket.id,
          picks: premCombo.picks.length,
          total_odds: premCombo.total,
        });
      }
    }

    // ───────────────────────────────────────────────────────────────────
    // ELITE TOP PICKS COMBO (extra Premium ticket, 1/day).
    // Cherry-picked from the same pool that powers "Top AI Picks Today":
    // Tier 1/2 leagues, confidence ≥ 78, variance stable.
    // Runs independently of the standard Premium loop above.
    // ───────────────────────────────────────────────────────────────────
    let eliteSkipReason: string | null = "Disabled — using fixed 2 Premium tickets per day";
    let eliteCreatedId: string | null = null;
    if (false) {
      const { data: existingElite } = await supabase
        .from("tickets")
        .select("id,title")
        .eq("ticket_date", date)
        .eq("category", "ai_premium")
        .ilike("title", "%Top Picks Combo%");
      if ((existingElite?.length ?? 0) > 0) {
        eliteSkipReason = "Top Picks Combo already exists today";
      } else if (premiumPool.length < 4) {
        eliteSkipReason = `Premium pool too small for Top Picks combo (${premiumPool.length} < 4)`;
      } else {
        const eliteSource = premiumPool.slice().sort((a, b) => b.confidence - a.confidence);
        const elite = buildElitePremiumCombo(eliteSource, new Set());
        if (!elite) {
          eliteSkipReason = "No valid Top Picks combo (4–5 picks, Tier 1/2, conf ≥78, stable)";
        } else {
          const eliteTitle = `👑 Top Picks Combo • ${elite.picks.length} Picks`;
          const { data: newEliteTicket, error: etErr } = await supabase
            .from("tickets")
            .insert({
              title: eliteTitle,
              tier: "premium",
              status: "published",
              category: "ai_premium",
              total_odds: elite.total,
              ticket_date: date,
              ai_analysis: `Top Picks Combo — cherry-picked from the highest-ranked AI predictions in top leagues (Tier 1/2, confidence ≥78, variance-stable). ${elite.picks.length} picks, total odds ${elite.total.toFixed(2)}x. Avg confidence: ${Math.round(
                elite.picks.reduce((s, x) => s + x.p.confidence, 0) / elite.picks.length,
              )}%.`,
            })
            .select()
            .single();
          if (etErr) {
            eliteSkipReason = `Insert failed: ${etErr.message}`;
          } else {
            const eliteRows = elite.picks.map((p, k) => ({
              ticket_id: newEliteTicket.id,
              match_name: `${p.p.home_team} vs ${p.p.away_team}`,
              home_team: p.p.home_team,
              away_team: p.p.away_team,
              league: p.p.league,
              prediction: p.choice.market,
              odds: p.choice.odds,
              match_date: p.p.match_date,
              sort_order: k,
            }));
            const { error: emErr } = await supabase.from("ticket_matches").insert(eliteRows);
            if (emErr) {
              eliteSkipReason = `Match insert failed: ${emErr.message}`;
            } else {
              eliteCreatedId = newEliteTicket.id;
              premiumCreated.push({
                id: newEliteTicket.id,
                picks: elite.picks.length,
                total_odds: elite.total,
              });
            }
          }
        }
      }
    }

    // ───────────────────────────────────────────────────────────────────
    // RISK TICKETS (4–5 per day) — bold AI picks, multi-match combos only
    //   - 3 or 4 picks per ticket (no singles, no doubles)
    //   - Each individual pick odds ≥ 2.50 (e.g. 2.50, 3.50, 4.00, 5.50)
    //   - Combined total odds ≥ 4.00 (no upper cap)
    //   - Source: Pro + Premium pools (no Free)
    //   - Tier: 'premium' — only Premium subscribers can access
    // ───────────────────────────────────────────────────────────────────
    const riskCreated: Array<{ id: string; picks: number; total_odds: number; size: number }> = [];
    let riskSkipReason: string | null = null;

    const { data: existingRisk } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "multi_risk");

    const existingRiskCount = existingRisk?.length ?? 0;
    // 4 default; 5 if combined Pro+Premium pool > 15
    const riskTarget: number = Number.isFinite(body?.risk_target)
      ? Math.max(0, Number(body.risk_target))
      : 2;
    const riskToCreate = Math.max(0, riskTarget - existingRiskCount);

    if (riskToCreate === 0) {
      riskSkipReason = existingRiskCount >= riskTarget
        ? "Multi-Risk tickets already at target"
        : "not_attempted";
    } else if (premiumPool.length + proPool.length < 1) {
      riskSkipReason = `Pool empty (Pro+Premium = 0)`;
    } else {
      const premOrdered = premiumPool.slice().sort((a, b) => b.confidence - a.confidence);
      const proOrderedR = proPool.slice().sort((a, b) => b.confidence - a.confidence);
      const riskUsed = new Set<string>();
      // Rotate ticket sizes for variety: single, double, triple, quadruple, double
      const sizes: RiskSize[] = [2, 3, 2, 3];

      for (let i = 0; i < riskToCreate; i++) {
        const size = sizes[(existingRiskCount + i) % sizes.length];
        const riskCombo = buildRiskCombo(premOrdered, proOrderedR, riskUsed, size);
        if (!riskCombo) {
          if (riskCreated.length === 0)
            riskSkipReason = `No valid Risk combo (size=${size}) — needs picks ≥ 2.50 and total odds ≥ 4.00`;
          continue;
        }
        const idx = existingRiskCount + i + 1;
        const sizeEmoji = riskCombo.size === 2 ? "⚡" : riskCombo.size === 3 ? "🔥" : "💥";
        const sizeName  = riskCombo.size === 2 ? "Double Risk" : riskCombo.size === 3 ? "Triple Threat" : "Quad Bomb";
        const riskTitle = `${sizeEmoji} Risk ${sizeName} #${idx} • ${riskCombo.picks.length} Pick${riskCombo.picks.length > 1 ? "s" : ""}`;
        const { data: newRiskTicket, error: rtErr } = await supabase
        .from("tickets")
        .insert({
          title: riskTitle,
          // Use 'premium' tier so only Premium subscribers can access Risk tickets.
          tier: "premium",
          status: "published",
          category: "multi_risk",
          total_odds: riskCombo.total,
          ticket_date: date,
            ai_analysis: `${sizeName}: ${riskCombo.picks.length} bold AI picks. Every single odds ≥ 2.50. Total combined odds ${riskCombo.total.toFixed(2)}x (3 or 4 picks). Source: Pro + Premium AI pools.`,
        })
          .select()
          .single();
        if (rtErr) throw rtErr;

        const riskRows = riskCombo.picks.map((p, k) => ({
          ticket_id: newRiskTicket.id,
          match_name: `${p.p.home_team} vs ${p.p.away_team}`,
          home_team: p.p.home_team,
          away_team: p.p.away_team,
          league: p.p.league,
          prediction: p.market,
          odds: p.odds,
          match_date: p.p.match_date,
          sort_order: k,
        }));
        const { error: rmErr } = await supabase.from("ticket_matches").insert(riskRows);
        if (rmErr) throw rmErr;

        riskCombo.picks.forEach((x) => riskUsed.add(x.p.match_id));
        riskCreated.push({
          id: newRiskTicket.id,
          picks: riskCombo.picks.length,
          total_odds: riskCombo.total,
          size: riskCombo.size,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        free_pool_size: freePool.length,
        pro_pool_size: proPool.length,
        premium_pool_size: premiumPool.length,
        target_tickets: targetTickets,
        created_count: created.length,
        tickets: created,
        daily_skip_reason: dailySkipReason,
        pro_target: proTarget,
        pro_created_count: proCreated.length,
        pro_tickets: proCreated,
        pro_skip_reason: proSkipReason,
        premium_target: premiumTarget,
        premium_created_count: premiumCreated.length,
        premium_tickets: premiumCreated,
        premium_skip_reason: premiumSkipReason,
        elite_ticket_id: eliteCreatedId,
        elite_skip_reason: eliteSkipReason,
        risk_target: riskTarget,
        risk_created_count: riskCreated.length,
        risk_tickets: riskCreated,
        risk_skip_reason: riskSkipReason,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-ai-ticket error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});