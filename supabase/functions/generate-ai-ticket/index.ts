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
): { picks: Pred[]; total: number } | null {
  const usedMatchIds = new Set<string>();
  const chosen: Pred[] = [];
  let total = 1;

  for (const p of pool) {
    if (chosen.length >= 7) break;
    if (usedMatchIds.has(p.match_id) || excludeMatchIds.has(p.match_id)) continue;
    if (isCorrectScore(p.prediction)) continue;
    const o = pickOdds(p);
    if (!o) continue;
    if (o < 1.2 || o > 2.6) continue;
    const next = total * o;
    if (next > 10.0) continue;
    chosen.push(p);
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
    if (existingCount >= 2) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Daily AI ticket cap (2) reached" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch today's predictions, EXCLUDING Premium tier (confidence >= 78).
    // Tier mapping: Premium ≥ 78, Pro 65–77, Free < 65.
    const { data: preds, error: pErr } = await supabase
      .from("ai_predictions")
      .select("id,match_id,home_team,away_team,league,match_date,prediction,confidence,consensus_odds,variance_stable,is_premium")
      .eq("match_date", date)
      .gte("confidence", 50)
      .lt("confidence", 78) // never include Premium
      .order("confidence", { ascending: false })
      .limit(60);

    if (pErr) throw pErr;
    const all = (preds ?? []) as Pred[];

    // Split into Free (<65) and Pro (65–77). Premium already excluded by query.
    const freePool = all.filter((p) => p.confidence < 65);
    const proPool = all.filter((p) => p.confidence >= 65 && p.confidence < 78);

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

    if (ticketsToCreate === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Already at target ticket count for today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const usedMatchIds = new Set<string>();
    const created: Array<{ id: string; picks: number; total_odds: number; strategy: string }> = [];

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
    // PRO TICKET (1 per day) — only from Pro pool, excludes correct score
    // ───────────────────────────────────────────────────────────────────
    let proResult: { id?: string; skipped?: boolean; reason?: string; picks?: number; total_odds?: number } = {
      skipped: true,
      reason: "not_attempted",
    };

    const { data: existingPro } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "ai_pro");

    if ((existingPro?.length ?? 0) >= 1) {
      proResult = { skipped: true, reason: "Pro AI ticket already exists for today" };
    } else if (proPool.length < 3) {
      proResult = { skipped: true, reason: `Pro pool too small (${proPool.length} < 3)` };
    } else {
      // Pro pool sorted by confidence DESC; prefer variance_stable when we have ≥3 stable.
      const stableProPool = proPool.filter((p) => p.variance_stable);
      const proSource = stableProPool.length >= 3 ? stableProPool : proPool;
      const proOrderedAll = proSource.slice().sort((a, b) => b.confidence - a.confidence);

      const proCombo = buildProCombo(proOrderedAll);
      if (!proCombo) {
        proResult = { skipped: true, reason: "No valid Pro combo (odds 3–10, 3–7 picks)" };
      } else {
        const proTitle = `🎯 AI Pro Combo • ${proCombo.picks.length} Picks • ${proCombo.total.toFixed(2)}x`;
        const { data: newProTicket, error: ptErr } = await supabase
          .from("tickets")
          .insert({
            title: proTitle,
            tier: "pro",
            status: "published",
            category: "ai_pro",
            total_odds: proCombo.total,
            ticket_date: date,
            ai_analysis: `Auto-generated Pro combo from ${proCombo.picks.length} high-confidence picks. Avg confidence: ${Math.round(
              proCombo.picks.reduce((s, p) => s + p.confidence, 0) / proCombo.picks.length,
            )}%. Markets: any (no correct score).`,
          })
          .select()
          .single();

        if (ptErr) throw ptErr;

        const proRows = proCombo.picks.map((p, idx) => ({
          ticket_id: newProTicket.id,
          match_name: `${p.home_team} vs ${p.away_team}`,
          home_team: p.home_team,
          away_team: p.away_team,
          league: p.league,
          prediction: p.prediction,
          odds: pickOdds(p)!,
          match_date: p.match_date,
          sort_order: idx,
        }));
        const { error: pmErr } = await supabase.from("ticket_matches").insert(proRows);
        if (pmErr) throw pmErr;

        proResult = {
          id: newProTicket.id,
          picks: proCombo.picks.length,
          total_odds: proCombo.total,
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        free_pool_size: freePool.length,
        pro_pool_size: proPool.length,
        target_tickets: targetTickets,
        created_count: created.length,
        tickets: created,
        pro_ticket: proResult,
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