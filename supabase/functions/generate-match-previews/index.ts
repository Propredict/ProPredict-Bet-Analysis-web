import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";
const MAX_PREVIEWS = 30;
const MIN_API_INTERVAL_MS = 250;
let lastApiCallAt = 0;

async function throttleApi() {
  const now = Date.now();
  const waitMs = lastApiCallAt + MIN_API_INTERVAL_MS - now;
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  lastApiCallAt = Date.now();
}

async function fetchApi(url: string, apiKey: string): Promise<any | null> {
  for (let attempt = 0; attempt <= 2; attempt++) {
    await throttleApi();
    try {
      const res = await fetch(url, {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": apiKey,
        },
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      return json?.response ?? null;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

function getRiskRating(confidence: number): string {
  if (confidence >= 80) return "low";
  if (confidence >= 65) return "medium";
  return "high";
}

function generateFormSummary(form: string | null, teamName: string): string {
  if (!form || form.length === 0) return `${teamName}: No recent form data available.`;
  const last5 = form.slice(-5);
  const wins = (last5.match(/W/g) || []).length;
  const draws = (last5.match(/D/g) || []).length;
  const losses = (last5.match(/L/g) || []).length;
  
  let trend = "mixed";
  if (wins >= 4) trend = "excellent";
  else if (wins >= 3) trend = "strong";
  else if (losses >= 4) trend = "poor";
  else if (losses >= 3) trend = "struggling";
  
  return `${teamName} (${last5}): ${wins}W ${draws}D ${losses}L — ${trend} form in last 5 matches.`;
}

function generateH2HSummary(h2hMatches: any[]): string {
  if (!h2hMatches || h2hMatches.length === 0) return "No head-to-head data available.";
  
  const last5 = h2hMatches.slice(0, 5);
  const homeTeamName = last5[0]?.teams?.home?.name || "Home";
  const awayTeamName = last5[0]?.teams?.away?.name || "Away";
  
  let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0;
  for (const m of last5) {
    const hg = m?.goals?.home ?? 0;
    const ag = m?.goals?.away ?? 0;
    totalGoals += hg + ag;
    if (hg > ag) homeWins++;
    else if (hg === ag) draws++;
    else awayWins++;
  }
  
  const avgGoals = (totalGoals / last5.length).toFixed(1);
  return `Last ${last5.length} H2H meetings: ${homeTeamName} ${homeWins}W, ${draws}D, ${awayTeamName} ${awayWins}W. Avg ${avgGoals} goals per match.`;
}

function generateTacticalNotes(
  prediction: any,
  homeStats: any,
  awayStats: any
): string {
  const notes: string[] = [];
  const hw = prediction.home_win ?? 0;
  const aw = prediction.away_win ?? 0;
  const dr = prediction.draw ?? 0;
  
  // Dominance
  const favored = hw >= aw ? prediction.home_team : prediction.away_team;
  const favoredPct = Math.max(hw, aw);
  if (favoredPct >= 60) {
    notes.push(`${favored} dominates with ${favoredPct}% win probability — clear edge.`);
  } else if (favoredPct >= 45) {
    notes.push(`${favored} has a slight edge at ${favoredPct}%, but this match is competitive.`);
  } else {
    notes.push(`Evenly matched — no clear favorite emerges from the data.`);
  }
  
  // Goals analysis
  if (homeStats && awayStats) {
    const homeGFAvg = homeStats.goalsForAvg ?? 0;
    const awayGFAvg = awayStats.goalsForAvg ?? 0;
    const homeGAAvg = homeStats.goalsAgainstAvg ?? 0;
    const awayGAAvg = awayStats.goalsAgainstAvg ?? 0;
    
    if (homeGFAvg + awayGFAvg > 3.0) {
      notes.push(`Both teams contribute to high-scoring matches (combined ${(homeGFAvg + awayGFAvg).toFixed(1)} goals/game avg).`);
    } else if (homeGAAvg < 1.0 && awayGAAvg < 1.0) {
      notes.push(`Defensively solid encounter expected — both teams concede under 1 goal per game.`);
    }
  }
  
  // Draw probability
  if (dr >= 30) {
    notes.push(`High draw probability (${dr}%) suggests a tight, tactical battle.`);
  }
  
  // Confidence note
  const conf = prediction.confidence ?? 0;
  if (conf >= 85) {
    notes.push(`AI confidence is ${conf}% — very strong conviction pick.`);
  } else if (conf >= 75) {
    notes.push(`AI confidence is ${conf}% — strong conviction pick.`);
  } else {
    notes.push(`AI confidence is ${conf}% — moderate conviction, proceed with caution.`);
  }
  
  return notes.join(" ");
}

function generatePreviewAnalysis(
  prediction: any,
  homeForm: string,
  awayForm: string,
  h2hSummary: string,
  tacticalNotes: string
): string {
  const parts: string[] = [];
  
  parts.push(`Match Analysis: ${prediction.home_team} vs ${prediction.away_team}`);
  parts.push("");
  parts.push(`📊 Form Overview:`);
  parts.push(homeForm);
  parts.push(awayForm);
  parts.push("");
  parts.push(`⚔️ Head-to-Head:`);
  parts.push(h2hSummary);
  parts.push("");
  parts.push(`🧠 Tactical Analysis:`);
  parts.push(tacticalNotes);
  
  if (prediction.key_factors && prediction.key_factors.length > 0) {
    parts.push("");
    parts.push(`🔑 Key Factors:`);
    for (const factor of prediction.key_factors.slice(0, 4)) {
      parts.push(`• ${factor}`);
    }
  }
  
  return parts.join("\n");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("API_FOOTBALL_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    console.log(`[match-previews] Generating previews for ${todayStr}`);

    // Step 1: Fetch today's AI predictions (source data)
    const { data: predictions, error: predError } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("match_date", todayStr)
      .order("confidence", { ascending: false });

    if (predError) {
      console.error("[match-previews] Error fetching predictions:", predError);
      return new Response(JSON.stringify({ error: "Failed to fetch predictions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!predictions || predictions.length === 0) {
      console.log("[match-previews] No predictions found for today");
      return new Response(JSON.stringify({ message: "No predictions available", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Filter out pending predictions, sort by risk (low first) then confidence
    const validPredictions = predictions.filter(
      (p: any) => !(p.confidence === 50 && (p.analysis || "").toLowerCase().includes("pending"))
    );

    // Sort: low risk first, then medium, then high, within each tier by confidence desc
    validPredictions.sort((a: any, b: any) => {
      const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
      const riskA = riskOrder[getRiskRating(a.confidence ?? 0)] ?? 3;
      const riskB = riskOrder[getRiskRating(b.confidence ?? 0)] ?? 3;
      if (riskA !== riskB) return riskA - riskB;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });

    const top30 = validPredictions.slice(0, MAX_PREVIEWS);
    console.log(`[match-previews] Processing ${top30.length} matches`);

    // Step 3: Enrich each match with form + H2H data
    const previews: any[] = [];

    for (let i = 0; i < top30.length; i++) {
      const pred = top30[i];
      const rank = i + 1;

      let homeFormStr = generateFormSummary(null, pred.home_team);
      let awayFormStr = generateFormSummary(null, pred.away_team);
      let h2hSummary = "No head-to-head data available.";
      let homeStats: any = null;
      let awayStats: any = null;

      // Only fetch API data for top 10 to save API calls
      if (rank <= 10) {
        try {
          // Fetch fixtures to get team IDs
          const fixtureData = await fetchApi(
            `${API_FOOTBALL_URL}/fixtures?date=${todayStr}&timezone=Europe/Belgrade`,
            apiKey
          );

          if (fixtureData && Array.isArray(fixtureData)) {
            const fixture = fixtureData.find((f: any) => {
              const hName = f?.teams?.home?.name || "";
              const aName = f?.teams?.away?.name || "";
              return (
                hName.toLowerCase().includes(pred.home_team.toLowerCase().slice(0, 5)) ||
                pred.home_team.toLowerCase().includes(hName.toLowerCase().slice(0, 5))
              ) && (
                aName.toLowerCase().includes(pred.away_team.toLowerCase().slice(0, 5)) ||
                pred.away_team.toLowerCase().includes(aName.toLowerCase().slice(0, 5))
              );
            });

            if (fixture) {
              const homeId = fixture.teams.home.id;
              const awayId = fixture.teams.away.id;
              const leagueId = fixture.league.id;
              const season = fixture.league.season;

              // Fetch team stats
              const [homeStatsData, awayStatsData] = await Promise.all([
                fetchApi(`${API_FOOTBALL_URL}/teams/statistics?team=${homeId}&league=${leagueId}&season=${season}`, apiKey),
                fetchApi(`${API_FOOTBALL_URL}/teams/statistics?team=${awayId}&league=${leagueId}&season=${season}`, apiKey),
              ]);

              if (homeStatsData) {
                const form = homeStatsData.form || (Array.isArray(homeStatsData) ? homeStatsData[0]?.form : null);
                homeFormStr = generateFormSummary(form || null, pred.home_team);
                homeStats = {
                  goalsForAvg: homeStatsData?.goals?.for?.average?.total ?? 0,
                  goalsAgainstAvg: homeStatsData?.goals?.against?.average?.total ?? 0,
                };
              }
              if (awayStatsData) {
                const form = awayStatsData.form || (Array.isArray(awayStatsData) ? awayStatsData[0]?.form : null);
                awayFormStr = generateFormSummary(form || null, pred.away_team);
                awayStats = {
                  goalsForAvg: awayStatsData?.goals?.for?.average?.total ?? 0,
                  goalsAgainstAvg: awayStatsData?.goals?.against?.average?.total ?? 0,
                };
              }

              // Fetch H2H
              const h2hData = await fetchApi(
                `${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`,
                apiKey
              );
              if (h2hData && Array.isArray(h2hData) && h2hData.length > 0) {
                h2hSummary = generateH2HSummary(h2hData);
              }
            }
          }
        } catch (err) {
          console.warn(`[match-previews] API enrichment failed for rank #${rank}:`, err);
        }
      }

      // Use existing key_factors from AI prediction for remaining matches
      const tacticalNotes = generateTacticalNotes(pred, homeStats, awayStats);
      const previewAnalysis = generatePreviewAnalysis(pred, homeFormStr, awayFormStr, h2hSummary, tacticalNotes);

      previews.push({
        match_id: pred.match_id,
        home_team: pred.home_team,
        away_team: pred.away_team,
        league: pred.league,
        match_date: todayStr,
        match_time: pred.match_time,
        preview_analysis: previewAnalysis,
        home_form: homeFormStr,
        away_form: awayFormStr,
        h2h_summary: h2hSummary,
        tactical_notes: tacticalNotes,
        key_stats: {
          key_factors: pred.key_factors || [],
          home_win: pred.home_win,
          draw: pred.draw,
          away_win: pred.away_win,
          last_home_goals: pred.last_home_goals,
          last_away_goals: pred.last_away_goals,
        },
        confidence_score: pred.confidence ?? 0,
        risk_rating: getRiskRating(pred.confidence ?? 0),
        home_win_prob: pred.home_win ?? 0,
        draw_prob: pred.draw ?? 0,
        away_win_prob: pred.away_win ?? 0,
        predicted_score: pred.predicted_score,
        rank,
      });
    }

    // Step 4: Delete old previews for today and insert new ones
    await supabase.from("match_previews").delete().eq("match_date", todayStr);

    const { error: insertError } = await supabase.from("match_previews").insert(previews);

    if (insertError) {
      console.error("[match-previews] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to insert previews", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[match-previews] Successfully generated ${previews.length} previews`);

    return new Response(
      JSON.stringify({ message: `Generated ${previews.length} match previews`, count: previews.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[match-previews] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
