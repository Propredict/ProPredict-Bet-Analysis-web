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
    const searchLower = search.toLowerCase();

    // Fetch 5 pages in parallel to maximize coverage for popular players
    const pagePromises = [1, 2, 3, 4, 5].map(page =>
      fetch(`${API_FOOTBALL_URL}/players/profiles?search=${q}&page=${page}`, { headers })
        .then(async r => {
          if (!r.ok) { await r.text(); return []; }
          const j = await r.json();
          return j.response || [];
        })
        .catch(() => [] as any[])
    );

    const pages = await Promise.all(pagePromises);
    const allProfiles = pages.flat();
    
    console.log(`Profile search for "${search}" returned ${allProfiles.length} results across 5 pages`);

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

    // Score and sort: prioritize exact/close name matches
    const scored = uniqueProfiles.map((p: any) => {
      const player = p.player || {};
      const name = (player.name || "").toLowerCase();
      const firstname = (player.firstname || "").toLowerCase();
      const lastname = (player.lastname || "").toLowerCase();
      
      let score = 0;
      
      // Exact lastname match (e.g., searching "Haaland" matches lastname containing "Haaland")
      if (lastname.split(" ").some((part: string) => part === searchLower)) score += 100;
      // Name field contains exact search term as a word
      else if (name.split(" ").some((part: string) => part.replace(".", "") === searchLower)) score += 90;
      // Lastname starts with search term
      else if (lastname.startsWith(searchLower)) score += 80;
      // Firstname exact match
      else if (firstname.split(" ").some((part: string) => part === searchLower)) score += 50;
      // Any partial match
      else if (name.includes(searchLower) || lastname.includes(searchLower)) score += 30;
      
      return { profile: p, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top 20 and map to response format
    const results = scored.slice(0, 20).map(({ profile }) => {
      const player = profile.player || {};
      return {
        id: player.id,
        name: player.name,
        firstname: player.firstname,
        lastname: player.lastname,
        photo: player.photo,
        nationality: player.nationality,
        age: player.age,
        team: { id: null, name: "", logo: "" },
        league: { name: "", logo: "" },
        position: "",
        appearances: 0,
        goals: 0,
        assists: 0,
      };
    });

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
