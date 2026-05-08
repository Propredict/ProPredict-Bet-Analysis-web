import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * AI Daily Ticket Generator
 *
 * Generates 1 Daily ticket per day automatically based on ai_predictions:
 *  - Combo strategy (preferred): 4–6 safest picks, total odds in [2.0, 6.0]
 *  - Single strategy (fallback): 1 pick with odds in [3.0, 4.0]
 *
 * Inserted as: tier='daily', status='published', category='ai_daily'.
 * Skips if an AI daily ticket already exists for today.
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

    // Skip if AI daily ticket already exists for today
    const { data: existing } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_date", date)
      .eq("category", "ai_daily")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "AI ticket already exists for today" }),
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

    // Try Free-only combo first
    let combo = buildCombo(freeOrdered);
    // Free insufficient → supplement with Pro (Free still iterated first)
    if (!combo) combo = buildCombo([...freeOrdered, ...proOrdered]);
    // Final fallback: single pick (Free preferred)
    if (!combo) combo = buildSingle([...freeOrdered, ...proOrdered]);

    if (!combo) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No suitable picks available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isCombo = combo.picks.length > 1;
    const title = isCombo
      ? `🤖 AI Daily Combo • ${combo.picks.length} Picks`
      : `🤖 AI Daily Pick • ${combo.picks[0].home_team} vs ${combo.picks[0].away_team}`;

    // Insert ticket
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

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: newTicket.id,
        strategy: isCombo ? "combo" : "single",
        picks: combo.picks.length,
        total_odds: combo.total,
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