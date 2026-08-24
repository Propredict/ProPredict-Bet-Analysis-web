import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function todayBelgrade(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const AUTH_SECRET = Deno.env.get("PUBLISH_DUE_TICKETS_SECRET") ?? "";

  // Accept scheduled cron calls (no body/secret) OR manual admin calls with secret
  let isManual = false;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      isManual = body?.manual === true;
      if (isManual && body?.secret !== AUTH_SECRET) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch {
      // Scheduled cron calls often have empty body; treat as non-manual
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = todayBelgrade();

  try {
    // Publish all draft tickets whose publish date has arrived (Belgrade time).
    // This lets admins create a Sure Odds 2+ ticket today and have it go
    // live automatically at midnight Europe/Belgrade.
    const { data, error } = await supabase
      .from("tickets")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("status", "draft")
      .not("ticket_date", "is", null)
      .lte("ticket_date", today)
      .select("id, title, ticket_date, category");

    if (error) {
      console.error("[publish-due-tickets] Update error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const published = data ?? [];
    console.log(`[publish-due-tickets] ${published.length} ticket(s) published for ${today}`);
    for (const t of published) {
      console.log(`  → ${t.id} | ${t.category ?? "-"} | ${t.title ?? "-"} | ${t.ticket_date}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        today,
        published_count: published.length,
        published: published.map((t) => ({ id: t.id, title: t.title, category: t.category })),
        manual: isManual,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[publish-due-tickets] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
