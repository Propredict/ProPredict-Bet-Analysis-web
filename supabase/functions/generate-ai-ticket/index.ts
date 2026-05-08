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
    candidates.push({ market: "Home or Draw", prob: hw + dr });
    candidates.push({ market: "Draw or Away", prob: dr + aw });
    candidates.push({ market: "Home or Away", prob: hw + aw });
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
    return { market: best.market, odds: clampOdds(best.prob), prob: best.prob };
  }

  // Fallback: keep original AI prediction with its odds (unless correct score)
  const original = (p.prediction || "").trim();
  const fallbackOdds = pickOdds(p) ?? 1.5;
  if (isCorrectScore(original)) {
    // Pick the better double chance from probabilities
    const dc = [
      { market: "Home or Draw", prob: hw + dr },
      { market: "Draw or Away", prob: dr + aw },
      { market: "Home or Away", prob: hw + aw },
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
    const o = pickOdds(p);
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
    const choice = safestProPick(p);
    // Skip if no safe market found (prob 0 fallback) and original is unsafe
    if (choice.prob > 0 && choice.prob < 65) continue;
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
  const used = new Set<string>();
  const chosen: { p: Pred; choice: MarketChoice }[] = [];
  let total = 1;
  // Target ratio: 60% premium, 40% pro
  const targetSize = 5;
  const targetPremium = 3;
  const targetPro = 2;
  let premiumCount = 0;
  let proCount = 0;

  const tryAdd = (p: Pred): boolean => {
    if (used.has(p.match_id) || excludeMatchIds.has(p.match_id)) return false;
    const choice = safestProPick(p);
    if (choice.prob > 0 && choice.prob < 60) return false;
    const o = choice.odds;
    if (o < 1.25 || o > 3.0) return false;
    const next = total * o;
    if (next > 15.0) return false;
    chosen.push({ p, choice });
    used.add(p.match_id);
    total = next;
    return true;
  };

  // First pass: fill premium quota
  for (const p of premiumOrdered) {
    if (premiumCount >= targetPremium) break;
    if (tryAdd(p)) premiumCount++;
  }
  // Second pass: fill pro quota
  for (const p of proOrdered) {
    if (proCount >= targetPro) break;
    if (tryAdd(p)) proCount++;
  }
  // Top-up if we are below target size or below odds floor — prefer remaining premium first
  if (chosen.length < targetSize || total < 5.0) {
    for (const p of premiumOrdered) {
      if (chosen.length >= 6) break;
      if (total >= 8.0 && chosen.length >= 4) break;
      tryAdd(p);
    }
  }
  if (chosen.length < targetSize || total < 5.0) {
    for (const p of proOrdered) {
      if (chosen.length >= 6) break;
      if (total >= 8.0 && chosen.length >= 4) break;
      tryAdd(p);
    }
  }

  if (chosen.length >= 4 && total >= 5.0 && total <= 15.0) {
    return { picks: chosen, total: Math.round(total * 100) / 100 };
  }
  return null;
}

function buildSingle(pool: Pred[], excludeMatchIds: Set<string> = new Set()): { picks: Pred[]; total: number } | null {
  const candidates = pool
    .filter((p) => !excludeMatchIds.has(p.match_id))
    .map((p) => ({ p, o: pickOdds(p) }))
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
type RiskSize = 1 | 2 | 3;

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
  // 1) Primary AI prediction with high natural odds.
  const original = (p.prediction || "").trim();
  const oOrig = pickOdds(p) ?? 0;
  if (original && !isCorrectScore(original) && oOrig >= 2.5 && oOrig <= 15) {
    return { market: original, odds: oOrig, prob: 0 };
  }

  const hw = p.home_win ?? 0;
  const dr = p.draw ?? 0;
  const aw = p.away_win ?? 0;

  const ps = (p.predicted_score || "").trim();
  const m = ps.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const hg = m ? parseInt(m[1], 10) : -1;
  const ag = m ? parseInt(m[2], 10) : -1;
  const total = hg >= 0 ? hg + ag : -1;

  const candidates: { market: string; prob: number }[] = [];
  if (hw > 0 || dr > 0 || aw > 0) {
    candidates.push({ market: "Home Win", prob: hw });
    candidates.push({ market: "Away Win", prob: aw });
    candidates.push({ market: "Draw", prob: dr });
  }
  if (total >= 0) {
    if (total >= 4) candidates.push({ market: "Over 3.5", prob: 60 });
    if (total >= 5) candidates.push({ market: "Over 4.5", prob: 50 });
    if (total <= 1) candidates.push({ market: "Under 1.5", prob: 50 });
    if (hg >= 2 && ag >= 2) candidates.push({ market: "GG & Over 2.5", prob: 55 });
  }

  // odds = (100/prob)*0.95, accept only if ≥ 2.50 and ≤ 15.0
  const eligible = candidates
    .map((c) => ({
      market: c.market,
      prob: c.prob,
      odds: Math.round((100 / Math.max(c.prob, 1)) * 0.95 * 100) / 100,
    }))
    .filter((c) => c.odds >= 2.5 && c.odds <= 15.0 && c.prob >= 12)
    .sort((a, b) => b.prob - a.prob);

  if (eligible.length > 0) {
    const best = eligible[0];
    return { market: best.market, odds: best.odds, prob: best.prob };
  }

  // Correct-score fallback — STRICTLY for the safest possible scorelines.
  // Requirements (ALL must be true):
  //   • Premium-grade confidence (≥ 85)
  //   • Variance is stable (model agrees across runs)
  //   • Common, low-total scoreline only: 1-0, 0-1, 1-1, 2-1, 1-2, 2-0, 0-2, 0-0
  //   • Total goals ≤ 3
  //   • Heuristic market odds in [3.50, 8.00] (typical for safe correct-score picks)
  //   • Predicted score aligns with the dominant 1X2 outcome (no contradictions)
  if (
    (p.confidence ?? 0) >= 85 &&
    p.variance_stable === true &&
    hg >= 0 && ag >= 0 &&
    (hg + ag) <= 3
  ) {
    const safeScores = new Set(["0-0", "1-0", "0-1", "1-1", "2-1", "1-2", "2-0", "0-2"]);
    const key = `${hg}-${ag}`;
    if (safeScores.has(key)) {
      // Score must agree with the strongest 1X2 probability
      const dominant = hw >= dr && hw >= aw ? "H" : aw >= hw && aw >= dr ? "A" : "D";
      const scoreSide = hg > ag ? "H" : ag > hg ? "A" : "D";
      if (dominant === scoreSide) {
        const o = correctScoreOdds(ps);
        if (o && o >= 2.5 && o <= 15.0) {
          return { market: `Correct Score ${hg}-${ag}`, odds: o, prob: 0 };
        }
      }
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
    // Per-match floor: every single odds must be ≥ 2.50
    if (pick.odds < 2.5) continue;
    // Look-ahead: don't blow past combined cap of 15.00
    if (total * pick.odds > 15) continue;
    chosen.push({ p, market: pick.market, odds: pick.odds });
    used.add(p.match_id);
    total *= pick.odds;
  }

  if (chosen.length !== size) return null;
  // Risk Ticket window: combined odds must be in [4.00, 15.00]
  if (total < 4 || total > 15) return null;
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
    const { data: preds, error: pErr } = await supabase
      .from("ai_predictions")
      .select("id,match_id,home_team,away_team,league,match_date,prediction,confidence,consensus_odds,variance_stable,is_premium,predicted_score,home_win,draw,away_win")
      .eq("match_date", date)
      .gte("confidence", 50)
      .order("confidence", { ascending: false })
      .limit(120);

    if (pErr) throw pErr;
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
    const targetTickets = freePool.length > 15 ? 2 : 1;
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
        ? `🤖 AI Daily Combo${targetTickets > 1 ? ` #${ticketIdx}` : ""} • ${combo.picks.length} Picks`
        : `🤖 AI Daily Pick${targetTickets > 1 ? ` #${ticketIdx}` : ""} • ${combo.picks[0].home_team} vs ${combo.picks[0].away_team}`;

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
        prediction: p.prediction,
        odds: pickOdds(p)!,
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
    const proTarget = proPool.length > 12 ? 2 : 1;
    const proToCreate = Math.max(0, proTarget - existingProCount);

    if (proToCreate === 0) {
      proSkipReason = existingProCount >= proTarget
        ? "Pro AI ticket already at target for today"
        : "not_attempted";
    } else if (proPool.length < 3) {
      proSkipReason = `Pro pool too small (${proPool.length} < 3)`;
    } else {
      const stableProPool = proPool.filter((p) => p.variance_stable);
      const proSource = stableProPool.length >= 3 ? stableProPool : proPool;
      const proOrderedAll = proSource.slice().sort((a, b) => b.confidence - a.confidence);
      const proUsed = new Set<string>();

      for (let i = 0; i < proToCreate; i++) {
        const proCombo = buildProCombo(proOrderedAll, proUsed);
        if (!proCombo) {
          if (proCreated.length === 0) proSkipReason = "No valid Pro combo (odds 3–10, 3–7 picks)";
          break;
        }
        const idx = existingProCount + i + 1;
        const proTitle = `🎯 AI Pro Combo${proTarget > 1 ? ` #${idx}` : ""} • ${proCombo.picks.length} Picks • ${proCombo.total.toFixed(2)}x`;
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
    const premiumTarget: number =
      premiumPool.length > 8 && proPool.length > 10 ? 3 : 2;
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
        const premTitle = `👑 AI Premium Combo${premiumTarget > 1 ? ` #${idx}` : ""} • ${premCombo.picks.length} Picks • ${premCombo.total.toFixed(2)}x`;
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
    // MULTI-RISK TICKETS (4–5 per day) — high-risk/high-payout combos
    //   - Mix of safe picks + risk picks (correct score, Over 3.5, NG, Draw)
    //   - Total odds 10–100, 3–6 picks, varied risk profiles
    //   - Source: Pro + Premium pools (no Free)
    //   - Page filter: tier='exclusive', category='multi_risk'
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
    const riskTarget = (proPool.length + premiumPool.length) > 15 ? 5 : 4;
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
      // Rotate ticket sizes for variety: single, double, triple, double, single
      const sizes: RiskSize[] = [1, 2, 3, 2, 1];

      for (let i = 0; i < riskToCreate; i++) {
        const size = sizes[(existingRiskCount + i) % sizes.length];
        const riskCombo = buildRiskCombo(premOrdered, proOrderedR, riskUsed, size);
        if (!riskCombo) {
          if (riskCreated.length === 0)
            riskSkipReason = `No valid Multi-Risk combo (size=${size}) — not enough picks with odds ≥ 2.50`;
          continue;
        }
        const idx = existingRiskCount + i + 1;
        const sizeEmoji = riskCombo.size === 1 ? "🎯" : riskCombo.size === 2 ? "⚡" : "🔥";
        const sizeName  = riskCombo.size === 1 ? "Solo Shot" : riskCombo.size === 2 ? "Double Up" : "Triple Threat";
        const riskTitle = `${sizeEmoji} Risk ${sizeName} #${idx} • ${riskCombo.picks.length} Pick${riskCombo.picks.length > 1 ? "s" : ""} • ${riskCombo.total.toFixed(2)}x`;
        const { data: newRiskTicket, error: rtErr } = await supabase
          .from("tickets")
          .insert({
            title: riskTitle,
            // Use 'exclusive' so canAccess('exclusive') gates as Pro/Premium-only.
            tier: "exclusive",
            status: "published",
            category: "multi_risk",
            total_odds: riskCombo.total,
            ticket_date: date,
            ai_analysis: `${sizeName}: ${riskCombo.picks.length} safe AI prediction${riskCombo.picks.length > 1 ? "s" : ""} where each market price is ≥ 2.50. Total odds ${riskCombo.total.toFixed(2)}x. Source: Pro + Premium AI pools.`,
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