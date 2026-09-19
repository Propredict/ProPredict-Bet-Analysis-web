/**
 * send-scheduled-picks-push
 *
 * Runs every 15 minutes (pg_cron). Sends the "new pick" push for published
 * tips/tickets that were scheduled for a later day, so users are pulled back
 * into the app during the day instead of at creation time.
 *
 * Rules:
 *  - tip    → push 7 hours before kickoff (match_date + match_time, UTC)
 *  - ticket → push from 08:00 Europe/Belgrade on its ticket_date
 *  - each row is sent once (push_sent_at is stamped)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function belgradeNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

/** Offset (ms) of Europe/Belgrade vs UTC at the given instant. */
function belgradeOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - at.getTime();
}

/**
 * Kickoff entered by admin is LOCAL (Europe/Belgrade) wall-clock time,
 * not UTC. Convert it to a real instant.
 */
function tipKickoff(row: any): Date | null {
  if (!row.match_date) return null;
  const t = (row.match_time ?? "00:00").toString().slice(0, 5);
  const naive = new Date(`${row.match_date}T${t}:00Z`);
  if (isNaN(naive.getTime())) return null;
  // First guess with the offset at the naive instant, then refine once (DST edges).
  let off = belgradeOffsetMs(naive);
  let real = new Date(naive.getTime() - off);
  off = belgradeOffsetMs(real);
  real = new Date(naive.getTime() - off);
  return real;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const { date: today, hour } = belgradeNow();
  const sent: string[] = [];

  async function push(type: "tip" | "ticket", record: any) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ type, record }),
    });
    const out = await res.text();
    console.log(`[scheduled-push] ${type} ${record.id} →`, res.status, out.slice(0, 200));
    await supabase.from(type === "tip" ? "tips" : "tickets")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", record.id);
    sent.push(`${type}:${record.id}`);
  }

  try {
    /* ── Tips: 7h before kickoff ── */
    const { data: tips } = await supabase
      .from("tips")
      .select("*")
      .eq("status", "published")
      .is("push_sent_at", null)
      .gte("tip_date", today);

    for (const tip of tips ?? []) {
      const kickoff = tipKickoff(tip);
      if (!kickoff) {
        // No kickoff time known → send on its day from 08:00 Belgrade
        if (tip.tip_date === today && hour >= 8) await push("tip", tip);
        continue;
      }
      if (kickoff.getTime() <= now.getTime()) continue; // already started
      const dueAt = kickoff.getTime() - 7 * 60 * 60 * 1000;
      if (now.getTime() >= dueAt) await push("tip", tip);
    }

    /* ── Tickets: from 08:00 Belgrade on ticket_date ── */
    if (hour >= 8) {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("status", "published")
        .is("push_sent_at", null)
        .eq("ticket_date", today);

      for (const ticket of tickets ?? []) await push("ticket", ticket);
    }

    return new Response(JSON.stringify({ success: true, sent_count: sent.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[scheduled-push] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
