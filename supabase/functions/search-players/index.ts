import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim();

    if (!search || search.length < 3) {
      return new Response(
        JSON.stringify({ error: "Search query must be at least 3 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = { "x-apisports-key": apiKey };
    const q = encodeURIComponent(search);

    // Step 1: Get player IDs from /players/profiles
    const profileRes = await fetch(`${API_FOOTBALL_URL}/players/profiles?search=${q}`, { headers });
    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("Profile search error:", profileRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to search players" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileJson = await profileRes.json();
    const profiles = profileJson.response || [];
    console.log(`Profile search for "${search}" returned ${profiles.length} results`);

    // Deduplicate by player ID, take top 8 to limit API calls
    const uniqueIds = [...new Set(
      profiles.map((x: any) => x.player?.id).filter(Boolean)
    )].slice(0, 8) as number[];

    if (uniqueIds.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Hydrate each player with full stats
    // Use Promise.all to fetch in parallel, try seasons 2025 then 2024
    const seasons = [2025, 2024];
    const hydratedPlayers = await Promise.all(
      uniqueIds.map(async (id: number) => {
        for (const season of seasons) {
          try {
            const r = await fetch(
              `${API_FOOTBALL_URL}/players?id=${id}&season=${season}`,
              { headers }
            );
            if (!r.ok) { await r.text(); continue; }
            const j = await r.json();
            if (j.response?.length > 0) {
              return j.response[0];
            }
          } catch (e) {
            console.error(`Error fetching player ${id} season ${season}:`, e);
          }
        }
        // Return basic profile data as fallback
        const profile = profiles.find((p: any) => p.player?.id === id);
        return profile || null;
      })
    );

    const results = hydratedPlayers.filter(Boolean);
    console.log(`Hydrated ${results.length} players out of ${uniqueIds.length} IDs`);

    return new Response(
      JSON.stringify(mapResults(results)),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching players:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapResults(results: any[]) {
  return results.map((item: any) => {
    const player = item.player || item;
    const stats = item.statistics || [];
    const primary = stats[0] || {};

    return {
      id: player.id,
      name: player.name,
      firstname: player.firstname,
      lastname: player.lastname,
      photo: player.photo,
      nationality: player.nationality,
      age: player.age,
      team: {
        id: primary.team?.id || null,
        name: primary.team?.name || "",
        logo: primary.team?.logo || "",
      },
      league: {
        name: primary.league?.name || "",
        logo: primary.league?.logo || "",
      },
      position: primary.games?.position || "",
      appearances: primary.games?.appearences || 0,
      goals: primary.goals?.total || 0,
      assists: primary.goals?.assists || 0,
    };
  });
}
