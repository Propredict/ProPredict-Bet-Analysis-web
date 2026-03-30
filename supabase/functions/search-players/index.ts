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

    // Search players by name using /players/profiles endpoint
    const res = await fetch(
      `${API_FOOTBALL_URL}/players/profiles?search=${encodeURIComponent(search)}`,
      { headers }
    );

    if (!res.ok) {
      console.error("API-Football error:", res.status, await res.text());
      return new Response(
        JSON.stringify({ error: "Failed to search players" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const results = json.response || [];

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
  return results.slice(0, 20).map((item: any) => {
    const player = item.player;
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
        id: primary.team?.id,
        name: primary.team?.name,
        logo: primary.team?.logo,
      },
      league: {
        name: primary.league?.name,
        logo: primary.league?.logo,
      },
      position: primary.games?.position || "",
      appearances: primary.games?.appearences || 0,
      goals: primary.goals?.total || 0,
      assists: primary.goals?.assists || 0,
    };
  });
}
