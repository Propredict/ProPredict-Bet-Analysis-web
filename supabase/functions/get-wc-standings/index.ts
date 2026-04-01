import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // World Cup 2026 = league 1, season 2026
    const url = "https://v3.football.api-sports.io/standings?league=1&season=2026";

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API-Football error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "API request failed", details: data }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract standings from response
    const standings = data?.response?.[0]?.league?.standings || [];

    // Flatten groups into a map: { "A": [...teams], "B": [...teams] }
    const groups: Record<string, Array<{
      team: string;
      logo: string;
      rank: number;
      points: number;
      played: number;
      win: number;
      draw: number;
      loss: number;
      goalsFor: number;
      goalsAgainst: number;
      goalsDiff: number;
    }>> = {};

    for (const group of standings) {
      if (!Array.isArray(group)) continue;
      for (const entry of group) {
        const groupName = (entry.group || "").replace("Group ", "");
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({
          team: entry.team?.name || "",
          logo: entry.team?.logo || "",
          rank: entry.rank || 0,
          points: entry.points || 0,
          played: entry.all?.played || 0,
          win: entry.all?.win || 0,
          draw: entry.all?.draw || 0,
          loss: entry.all?.lose || 0,
          goalsFor: entry.all?.goals?.for || 0,
          goalsAgainst: entry.all?.goals?.against || 0,
          goalsDiff: entry.goalsDiff || 0,
        });
      }
    }

    return new Response(JSON.stringify({ standings: groups, hasData: Object.keys(groups).length > 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching WC standings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
