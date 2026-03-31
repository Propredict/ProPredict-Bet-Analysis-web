import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("player");
    const currentYear = new Date().getFullYear();
    const season = url.searchParams.get("season") || String(currentYear);

    if (!playerId) {
      return new Response(
        JSON.stringify({ error: "Missing player parameter" }),
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

    // Try current season first, fallback to previous
    let data: any = null;
    for (const s of [season, String(Number(season) - 1)]) {
      const res = await fetch(
        `${API_FOOTBALL_URL}/players?id=${playerId}&season=${s}`,
        { headers }
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json.response?.length > 0) {
        data = json.response[0];
        break;
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Player not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const player = data.player;
    const stats = data.statistics || [];
    const primary = stats[0] || {};

    // Fetch transfers, trophies, sidelined, career teams, and available seasons in parallel
    const [transfersRes, trophiesRes, sidelinedRes, teamsRes, seasonsRes] = await Promise.all([
      fetch(`${API_FOOTBALL_URL}/transfers?player=${playerId}`, { headers }).then(r => r.json()).catch(() => ({ response: [] })),
      fetch(`${API_FOOTBALL_URL}/trophies?player=${playerId}`, { headers }).then(r => r.json()).catch(() => ({ response: [] })),
      fetch(`${API_FOOTBALL_URL}/sidelined?player=${playerId}`, { headers }).then(r => r.json()).catch(() => ({ response: [] })),
      fetch(`${API_FOOTBALL_URL}/players/teams?player=${playerId}`, { headers }).then(r => r.json()).catch(() => ({ response: [] })),
      fetch(`${API_FOOTBALL_URL}/players/seasons?player=${playerId}`, { headers }).then(r => r.json()).catch(() => ({ response: [] })),
    ]);

    // Normalize transfers
    const transfers = (transfersRes.response?.[0]?.transfers || []).slice(0, 15).map((t: any) => ({
      date: t.date,
      type: t.type,
      teams: {
        from: { id: t.teams?.in?.id, name: t.teams?.out?.name, logo: t.teams?.out?.logo },
        to: { id: t.teams?.out?.id, name: t.teams?.in?.name, logo: t.teams?.in?.logo },
      },
    }));

    // Normalize trophies
    const trophies = (trophiesRes.response || []).map((t: any) => ({
      league: t.league,
      country: t.country,
      season: t.season,
      place: t.place,
    }));

    // Normalize sidelined (injury history)
    const sidelined = (sidelinedRes.response || []).slice(0, 10).map((s: any) => ({
      type: s.type,
      start: s.start,
      end: s.end,
    }));

    // Normalize career teams
    const careerTeams = (teamsRes.response || []).map((t: any) => ({
      team: {
        id: t.team?.id,
        name: t.team?.name,
        logo: t.team?.logo,
      },
      seasons: t.seasons || [],
    }));

    const responseData = {
      player: {
        id: player.id,
        name: player.name,
        firstname: player.firstname,
        lastname: player.lastname,
        photo: player.photo,
        nationality: player.nationality,
        age: player.age,
        height: player.height,
        weight: player.weight,
        birth: {
          date: player.birth?.date,
          place: player.birth?.place,
          country: player.birth?.country,
        },
        injured: player.injured,
      },
      team: {
        id: primary.team?.id,
        name: primary.team?.name,
        logo: primary.team?.logo,
      },
      league: {
        id: primary.league?.id,
        name: primary.league?.name,
        logo: primary.league?.logo,
        country: primary.league?.country,
        season: primary.league?.season,
      },
      stats: {
        appearances: primary.games?.appearences || 0,
        lineups: primary.games?.lineups || 0,
        minutes: primary.games?.minutes || 0,
        position: primary.games?.position || "",
        rating: primary.games?.rating || null,
        captain: primary.games?.captain || false,
        goals: primary.goals?.total || 0,
        assists: primary.goals?.assists || 0,
        saves: primary.goals?.saves || null,
        conceded: primary.goals?.conceded || null,
        shots: {
          total: primary.shots?.total || 0,
          on: primary.shots?.on || 0,
        },
        passes: {
          total: primary.passes?.total || 0,
          key: primary.passes?.key || 0,
          accuracy: primary.passes?.accuracy || 0,
        },
        tackles: {
          total: primary.tackles?.total || 0,
          blocks: primary.tackles?.blocks || 0,
          interceptions: primary.tackles?.interceptions || 0,
        },
        duels: {
          total: primary.duels?.total || 0,
          won: primary.duels?.won || 0,
        },
        dribbles: {
          attempts: primary.dribbles?.attempts || 0,
          success: primary.dribbles?.success || 0,
        },
        fouls: {
          drawn: primary.fouls?.drawn || 0,
          committed: primary.fouls?.committed || 0,
        },
        cards: {
          yellow: primary.cards?.yellow || 0,
          yellowred: primary.cards?.yellowred || 0,
          red: primary.cards?.red || 0,
        },
        penalty: {
          won: primary.penalty?.won || 0,
          scored: primary.penalty?.scored || 0,
          missed: primary.penalty?.missed || 0,
          saved: primary.penalty?.saved || 0,
        },
      },
      allStats: stats.map((s: any) => ({
        team: { id: s.team?.id, name: s.team?.name, logo: s.team?.logo },
        league: { name: s.league?.name, logo: s.league?.logo },
        appearances: s.games?.appearences || 0,
        goals: s.goals?.total || 0,
        assists: s.goals?.assists || 0,
      })),
      transfers,
      trophies,
      sidelined,
      careerTeams,
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching player profile:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
