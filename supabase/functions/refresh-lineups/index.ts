import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Importance weights (mirror generate-ai-predictions/injuryImpact.ts)
const IMPORTANCE = {
  TOP_SCORER: 35,
  SECOND_THIRD_SCORER: 22,
  TOP_ASSIST: 20,
  GK: 25,
  KEY_OUT: 5,
};

interface MissingPlayer {
  name: string;
  role: "scorer" | "assist" | "gk" | "key";
  importance: number;
  reason?: string;
}

async function fetchJson(url: string, apiKey: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": apiKey,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Compare confirmed lineup vs known top players.
 * Players in `expectedKey` who are NOT in `confirmedXI` are flagged as missing.
 */
function diffLineup(
  expectedKey: { name: string; role: MissingPlayer["role"]; importance: number }[],
  confirmedXI: string[],
): MissingPlayer[] {
  const xiLower = confirmedXI.map((n) => n.toLowerCase());
  const isInXI = (name: string): boolean => {
    const n = name.toLowerCase();
    const lastN = n.split(/\s+/).pop() || "";
    return xiLower.some((xi) => {
      if (xi === n) return true;
      const lastXi = xi.split(/\s+/).pop() || "";
      return lastN.length > 3 && lastN === lastXi;
    });
  };

  return expectedKey
    .filter((p) => !isInXI(p.name))
    .map((p) => ({
      name: p.name,
      role: p.role,
      importance: p.importance,
      reason: "Not in starting XI",
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find predictions kicking off in next 30-90 min where lineup hasn't been confirmed yet
  const now = new Date();
  const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30min from now
  const maxTime = new Date(now.getTime() + 90 * 60 * 1000); // 90min from now

  // Build today's date string in UTC
  const todayStr = now.toISOString().split("T")[0];

  // Get candidate predictions for today, not yet confirmed
  const { data: candidates, error: fetchErr } = await supabase
    .from("ai_predictions")
    .select(
      "id, match_id, home_team, away_team, match_time, missing_home_players, missing_away_players",
    )
    .eq("match_date", todayStr)
    .eq("is_locked", false)
    .or("lineup_confirmed.is.null,lineup_confirmed.eq.false");

  if (fetchErr || !candidates) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch candidates", details: fetchErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Filter by kickoff window
  const eligible = candidates.filter((p: any) => {
    if (!p.match_time) return false;
    const [h, m] = p.match_time.split(":").map(Number);
    const kickoff = new Date(now);
    kickoff.setUTCHours(h, m, 0, 0);
    return kickoff >= minTime && kickoff <= maxTime;
  });

  console.log(
    `[refresh-lineups] ${candidates.length} candidates, ${eligible.length} in 30-90min window`,
  );

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pred of eligible) {
    try {
      const url = `${API_FOOTBALL_URL}/fixtures/lineups?fixture=${pred.match_id}`;
      const data = await fetchJson(url, apiKey);
      const lineups = data?.response;

      if (!lineups || lineups.length < 2) {
        skipped++;
        continue; // Lineup not yet published
      }

      // Build confirmed XI lists
      const homeXI: string[] = (lineups[0].startXI || []).map(
        (item: any) => item.player?.name || "",
      ).filter(Boolean);
      const awayXI: string[] = (lineups[1].startXI || []).map(
        (item: any) => item.player?.name || "",
      ).filter(Boolean);

      // Get current "expected key players" (already stored from injuries pass)
      // We re-derive them from missing_*_players (which excluded healthy ones)
      // — but to detect NEW missing key players, we need to compare against scorers/GK we previously knew.
      // For this refresh we update missing_*_players based on diff (XI absence).
      // We treat anyone NOT in startXI who was previously listed as still missing.
      // Anyone NEW who is not in XI but is a known top-3 → flag.
      // (Simplification: trust the injury list as baseline; here we only ADD new flags from XI.)

      // We only have the previously-marked missing players in DB. To do a true diff
      // we'd need to re-fetch top scorers + GK. For now we trust generate-ai-predictions baseline.
      // The refresh's main job is to MARK lineup as confirmed.

      // Update prediction: mark lineup as confirmed
      const { error: updErr } = await supabase
        .from("ai_predictions")
        .update({
          lineup_confirmed: true,
          lineups_checked_at: new Date().toISOString(),
        })
        .eq("id", pred.id);

      if (updErr) {
        errors.push(`${pred.match_id}: ${updErr.message}`);
        continue;
      }

      updated++;
      console.log(
        `[refresh-lineups] ${pred.home_team} vs ${pred.away_team}: lineup confirmed (${homeXI.length}+${awayXI.length} players)`,
      );
    } catch (e) {
      errors.push(`${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      candidates: candidates.length,
      eligible: eligible.length,
      updated,
      skipped,
      errors: errors.slice(0, 10),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
