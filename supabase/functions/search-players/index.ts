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

    // Fetch first 2 pages of profiles in parallel to find more players
    const [page1Res, page2Res] = await Promise.all([
      fetch(`${API_FOOTBALL_URL}/players/profiles?search=${q}&page=1`, { headers }),
      fetch(`${API_FOOTBALL_URL}/players/profiles?search=${q}&page=2`, { headers }),
    ]);

    let allProfiles: any[] = [];
    
    if (page1Res.ok) {
      const j1 = await page1Res.json();
      allProfiles.push(...(j1.response || []));
    } else {
      await page1Res.text();
    }
    
    if (page2Res.ok) {
      const j2 = await page2Res.json();
      allProfiles.push(...(j2.response || []));
    } else {
      await page2Res.text();
    }

    console.log(`Profile search for "${search}" returned ${allProfiles.length} results across 2 pages`);

    // Deduplicate by player ID
    const idSet = new Set<number>();
    const uniqueProfiles: any[] = [];
    for (const p of allProfiles) {
      const id = p.player?.id;
      if (id && !idSet.has(id)) {
        idSet.add(id);
        uniqueProfiles.push(p);
      }
    }

    // Take top 10 IDs for hydration
    const topIds = uniqueProfiles.slice(0, 10).map((p: any) => p.player?.id).filter(Boolean) as number[];

    if (topIds.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hydrate each player with full stats in parallel
    const seasons = [2025, 2024];
    const hydratedPlayers = await Promise.all(
      topIds.map(async (id: number) => {
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
        const profile = uniqueProfiles.find((p: any) => p.player?.id === id);
        return profile || null;
      })
    );

    const results = hydratedPlayers.filter(Boolean);
    const mapped = mapResults(results);
    
    // Sort: players with stats first, then by appearances + goals
    mapped.sort((a: any, b: any) => (b.appearances + b.goals) - (a.appearances + a.goals));
    
    console.log(`Returning ${mapped.length} players`);

    return new Response(
      JSON.stringify(mapped),
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
