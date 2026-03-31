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
    const teamId = url.searchParams.get("team");

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "Missing team parameter" }),
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
    const res = await fetch(`${API_FOOTBALL_URL}/players/squads?team=${teamId}`, { headers });

    if (!res.ok) {
      const text = await res.text();
      console.error("Squad API error:", text);
      return new Response(
        JSON.stringify({ error: "Failed to fetch squad" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const teamData = json.response?.[0];

    if (!teamData) {
      return new Response(
        JSON.stringify({ team: null, players: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const players = (teamData.players || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      number: p.number,
      position: p.position,
      photo: p.photo,
    }));

    return new Response(
      JSON.stringify({
        team: {
          id: teamData.team?.id,
          name: teamData.team?.name,
          logo: teamData.team?.logo,
        },
        players,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching squad:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
