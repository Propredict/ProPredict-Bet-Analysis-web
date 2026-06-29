import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("ai_predictions")
    .update({
      prediction: "Under 2.5",
      predicted_score: "1-0",
      home_win: 60,
      draw: 22,
      away_win: 18,
      confidence: 72,
    })
    .or("home_team.ilike.%germany%,away_team.ilike.%germany%")
    .gte("created_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .select("id, home_team, away_team, prediction, predicted_score");
  return new Response(JSON.stringify({ data, error }), {
    headers: { "content-type": "application/json" },
  });
});