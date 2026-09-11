import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// In-memory cache (per warm instance) — 30 min TTL.
// Avoids burning API-Football daily quota on repeated views of the same match.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; odds: unknown[] }>();

function cached(id: string): unknown[] | null {
  const hit = cache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(id);
    return null;
  }
  return hit.odds;
}

/**
 * Fallback: build a 1X2 ("Match Winner") block from the last stored
 * consensus snapshot so the UI still shows real bookmaker odds when the
 * live API is unavailable or the daily request limit is reached.
 */
async function snapshotFallback(fixtureId: string): Promise<unknown[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return [];

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("odds_snapshots")
    .select("consensus_home, consensus_draw, consensus_away, bookmakers_count, captured_at")
    .eq("match_id", String(fixtureId))
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("snapshot fallback failed:", error.message);
    return [];
  }
  if (!data?.consensus_home || !data?.consensus_away) return [];

  const fmt = (n: number | null) => (n && n > 1 ? n.toFixed(2) : null);
  const values = [
    { value: "Home", odd: fmt(data.consensus_home) },
    { value: "Draw", odd: fmt(data.consensus_draw) },
    { value: "Away", odd: fmt(data.consensus_away) },
  ].filter((v) => v.odd !== null);

  if (values.length < 2) return [];

  return [
    {
      id: 1,
      name: "Match Winner",
      values,
    },
  ];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fixtureId = url.searchParams.get("fixtureId");

    if (!fixtureId || !/^\d+$/.test(fixtureId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid fixtureId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hit = cached(fixtureId);
    if (hit) {
      return new Response(
        JSON.stringify({ odds: hit, source: "cache" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    let live: unknown[] = [];

    if (apiKey) {
      try {
        const oddsRes = await fetch(`${API_FOOTBALL_URL}/odds?fixture=${fixtureId}`, {
          headers: { "x-apisports-key": apiKey },
        });
        const oddsData = await oddsRes.json().catch(() => null);
        if (!oddsRes.ok || (oddsData?.errors && Object.keys(oddsData.errors).length > 0)) {
          console.error(
            `API-Football odds unavailable [${oddsRes.status}]:`,
            JSON.stringify(oddsData?.errors ?? {}),
          );
        } else if (Array.isArray(oddsData?.response)) {
          live = oddsData.response;
        }
      } catch (e) {
        console.error("API-Football odds request failed:", (e as Error).message);
      }
    } else {
      console.error("API_FOOTBALL_KEY not configured");
    }

    if (live.length > 0) {
      cache.set(fixtureId, { at: Date.now(), odds: live });
      return new Response(
        JSON.stringify({ odds: live, source: "api" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No live odds — serve the stored bookmaker consensus instead of nothing.
    const fallback = await snapshotFallback(fixtureId);
    if (fallback.length > 0) {
      cache.set(fixtureId, { at: Date.now(), odds: fallback });
    }

    return new Response(
      JSON.stringify({ odds: fallback, source: fallback.length ? "snapshot" : "none" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching odds:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", odds: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
