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

  const { data: rows } = await sb
    .from("ai_predictions")
    .select("id, home_team, away_team, analysis, predicted_score")
    .or("home_team.ilike.%canada%,away_team.ilike.%canada%")
    .gte("match_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
    .order("match_date", { ascending: false })
    .limit(5);

  const target = (rows || []).find(
    (r) => /canada/i.test(r.home_team) && /qatar/i.test(r.away_team),
  );
  if (!target) return new Response(JSON.stringify({ ok: false }), { headers: { ...cors, "Content-Type": "application/json" } });

  let analysis = (target.analysis || "") as string;
  // Force BTTS No marker recognized by chip parser (`/btts[^.]*\bno\b/`).
  analysis = analysis.replace(/btts[^.]*\byes\b/gi, "BTTS No");
  if (!/btts[^.]*\bno\b/i.test(analysis)) {
    analysis = `BTTS No. ${analysis}`;
  }

  const { error: updErr } = await sb
    .from("ai_predictions")
    .update({
      analysis,
      predicted_score: "3-0",
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  return new Response(JSON.stringify({ ok: !updErr, id: target.id, updErr }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});