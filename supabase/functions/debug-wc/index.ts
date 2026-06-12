const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("API_FOOTBALL_KEY")!;
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "standings?league=1&season=2026";
  const r = await fetch(`https://v3.football.api-sports.io/${path}`, {
    headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
  });
  const data = await r.json();
  return new Response(JSON.stringify({ results: data.results, errors: data.errors, sample: data.response?.slice?.(0, 3) ?? data.response }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});