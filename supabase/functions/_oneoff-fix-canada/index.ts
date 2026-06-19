import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error: selErr } = await sb
    .from("ai_predictions")
    .select("id, home_team, away_team, match_date, prediction, confidence, predicted_score, analysis")
    .or("home_team.ilike.%canada%,away_team.ilike.%canada%")
    .gte("match_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
    .order("match_date", { ascending: false })
    .limit(5);
  if (selErr) return new Response(JSON.stringify({ selErr }), { headers: { ...cors, "Content-Type": "application/json" }, status: 500 });

  const target = (rows || []).find(
    (r) => /canada/i.test(r.home_team) && /qatar/i.test(r.away_team),
  );
  if (!target) {
    return new Response(JSON.stringify({ ok: false, msg: "no row", rows }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  const oldAnalysis = (target.analysis || "") as string;
  // Strip any "under 2.5" mention and inject explicit "Over 2.5".
  let newAnalysis = oldAnalysis.replace(/under\s*2\.?5/gi, "Over 2.5");
  if (!/over\s*2\.?5/i.test(newAnalysis)) {
    newAnalysis = `Over 2.5 goals likely. ${newAnalysis}`;
  }

  const { error: updErr } = await sb
    .from("ai_predictions")
    .update({
      analysis: newAnalysis,
      predicted_score: "3-1",
      confidence: 85,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  return new Response(
    JSON.stringify({ ok: !updErr, id: target.id, updErr, before: target, newAnalysis }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});