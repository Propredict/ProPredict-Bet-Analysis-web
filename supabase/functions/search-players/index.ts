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

    if (!search || search.length < 2) {
      return new Response(
        JSON.stringify({ error: "Search query must be at least 2 characters" }),
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
    const searchLower = search.toLowerCase();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed
    // Fetch from BOTH endpoints in parallel:
    // 1. /players/profiles (basic profiles, no stats)
    // 2. /players?search=&season= (full player data with stats - better for famous players)
    const [profilePages, statsPages] = await Promise.all([
      // Profiles endpoint: 3 pages
      Promise.all(
        [1, 2, 3].map(page =>
          fetch(`${API_FOOTBALL_URL}/players/profiles?search=${q}&page=${page}`, { headers })
            .then(async r => { if (!r.ok) { await r.text(); return []; } const j = await r.json(); return j.response || []; })
            .catch(() => [] as any[])
        )
      ),
      // Players endpoint with season: try current then previous
      Promise.all(
        [currentYear, currentYear - 1].map(season =>
          fetch(`${API_FOOTBALL_URL}/players?search=${q}&season=${season}`, { headers })
            .then(async r => { if (!r.ok) { await r.text(); return []; } const j = await r.json(); return j.response || []; })
            .catch(() => [] as any[])
        )
      ),
    ]);

    const allProfiles = profilePages.flat();
    const allStatsResults = statsPages.flat();

    console.log(`Search "${search}": ${allProfiles.length} profiles, ${allStatsResults.length} stats results`);

    // Merge both sources, prioritizing stats results (they have more data)
    const idMap = new Map<number, any>();

    // First add stats results (richer data)
    for (const entry of allStatsResults) {
      const p = entry.player;
      const stat = entry.statistics?.[0];
      if (!p?.id) continue;
      idMap.set(p.id, {
        id: p.id,
        name: p.name,
        firstname: p.firstname,
        lastname: p.lastname,
        photo: p.photo,
        nationality: p.nationality,
        age: p.age,
        team: { id: stat?.team?.id || null, name: stat?.team?.name || "", logo: stat?.team?.logo || "" },
        league: { name: stat?.league?.name || "", logo: stat?.league?.logo || "" },
        position: stat?.games?.position || "",
        appearances: stat?.games?.appearences || 0,
        goals: stat?.goals?.total || 0,
        assists: stat?.goals?.assists || 0,
        hasStats: true,
      });
    }

    // Then add profile results (only if not already present)
    for (const entry of allProfiles) {
      const p = entry.player || entry;
      if (!p?.id || idMap.has(p.id)) continue;
      idMap.set(p.id, {
        id: p.id,
        name: p.name,
        firstname: p.firstname,
        lastname: p.lastname,
        photo: p.photo,
        nationality: p.nationality,
        age: p.age,
        team: { id: null, name: "", logo: "" },
        league: { name: "", logo: "" },
        position: "",
        appearances: 0,
        goals: 0,
        assists: 0,
        hasStats: false,
      });
    }

    const allPlayers = Array.from(idMap.values());

    // Score and sort: prioritize exact/close name matches and completeness
    const searchWords = searchLower.split(/\s+/).filter(Boolean);
    
    const scored = allPlayers.map((player: any) => {
      const name = (player.name || "").toLowerCase();
      const firstname = (player.firstname || "").toLowerCase();
      const lastname = (player.lastname || "").toLowerCase();
      const fullName = `${firstname} ${lastname}`.toLowerCase();
      
      let score = 0;
      
      // Multi-word search: all words match
      if (searchWords.length > 1 && searchWords.every(w => fullName.includes(w))) {
        score += 200;
      }
      // Exact lastname match
      else if (lastname.split(" ").some((part: string) => part === searchLower)) score += 100;
      // Name field exact word match
      else if (name.split(/[\s.]+/).some((part: string) => part === searchLower)) score += 95;
      // Lastname starts with search
      else if (lastname.startsWith(searchLower)) score += 80;
      // Firstname exact match
      else if (firstname.split(" ").some((part: string) => part === searchLower)) score += 50;
      // Partial match
      else if (name.includes(searchLower) || lastname.includes(searchLower)) score += 30;
      
      // Big bonus for having actual season stats (real active players)
      if (player.hasStats) score += 50;
      if (player.appearances > 0) score += 20;
      if (player.goals > 0) score += 10;
      
      // Bonus for complete profile
      if (player.nationality) score += 5;
      if (player.firstname && player.lastname) score += 5;
      if (player.team?.name) score += 5;
      
      return { player, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Filter out players with no meaningful data (no team, no stats, no league)
    // These are typically inactive/unknown players with generic placeholder photos
    const meaningful = scored.filter(({ player }) => {
      // Always keep players with stats
      if (player.hasStats) return true;
      // Keep if they have a team
      if (player.team?.name) return true;
      // Keep if they have a known position
      if (player.position) return true;
      // Drop players with zero data - they're noise
      return false;
    });

    // If filtering removed too many results, fallback to all (but still sorted)
    const finalList = meaningful.length >= 3 ? meaningful : scored;

    const results = finalList.slice(0, 15).map(({ player }) => ({
      id: player.id,
      name: player.name,
      firstname: player.firstname,
      lastname: player.lastname,
      photo: player.photo,
      nationality: player.nationality,
      age: player.age,
      team: player.team,
      league: player.league,
      position: player.position,
      appearances: player.appearances,
      goals: player.goals,
      assists: player.assists,
    }));

    console.log(`Returning ${results.length} players`);

    return new Response(
      JSON.stringify(results),
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
