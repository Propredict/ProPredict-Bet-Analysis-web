/**
 * setup-scheduled-picks-push  (one-off admin/setup function)
 *
 * - adds tips.push_sent_at / tickets.push_sent_at
 * - rewrites the publish triggers so scheduled (future-day) content does NOT
 *   push immediately
 * - schedules send-scheduled-picks-push every 15 minutes
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try { return JSON.parse(atob(padded)); } catch { return null; }
}

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA";
const FN_BASE = "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (decodeJwtPayload(token)?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const connectionString = Deno.env.get("SUPABASE_DB_URL");
  if (!connectionString) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not set" }), { status: 500, headers: corsHeaders });
  }

  const client = new Client(connectionString);
  try {
    await client.connect();

    await client.queryArray(`ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS push_sent_at timestamptz`);
    await client.queryArray(`ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS push_sent_at timestamptz`);

    await client.queryArray(`
      CREATE OR REPLACE FUNCTION public.notify_tip_published()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public', 'extensions'
      AS $fn$
      DECLARE
        v_kickoff timestamptz;
        v_today date := (now() AT TIME ZONE 'Europe/Belgrade')::date;
      BEGIN
        IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') AND NEW.push_sent_at IS NULL THEN

          IF NEW.match_date IS NOT NULL THEN
            v_kickoff := (NEW.match_date::text || ' ' || COALESCE(NULLIF(left(NEW.match_time, 5), ''), '00:00') || ':00')::timestamp AT TIME ZONE 'UTC';
          END IF;

          IF (NEW.tip_date IS NOT NULL AND NEW.tip_date > v_today)
             OR (v_kickoff IS NOT NULL AND v_kickoff > now() + interval '7 hours') THEN
            RETURN NEW;
          END IF;

          PERFORM net.http_post(
            url := '${FN_BASE}/send-push-notification',
            headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', '${ANON_KEY}'),
            body := jsonb_build_object(
              'type', 'tip',
              'record', jsonb_build_object(
                'id', NEW.id, 'status', NEW.status, 'tier', NEW.tier,
                'home_team', NEW.home_team, 'away_team', NEW.away_team,
                'league', NEW.league, 'prediction', NEW.prediction
              )
            )
          );

          UPDATE public.tips SET push_sent_at = now() WHERE id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $fn$
    `);

    await client.queryArray(`
      CREATE OR REPLACE FUNCTION public.notify_ticket_published()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public', 'extensions'
      AS $fn$
      DECLARE
        v_today date := (now() AT TIME ZONE 'Europe/Belgrade')::date;
      BEGIN
        IF (NEW.status = 'published') AND (OLD.status IS DISTINCT FROM 'published') AND NEW.push_sent_at IS NULL THEN

          IF NEW.ticket_date IS NOT NULL AND NEW.ticket_date > v_today THEN
            RETURN NEW;
          END IF;

          PERFORM net.http_post(
            url := '${FN_BASE}/send-push-notification',
            headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', '${ANON_KEY}'),
            body := jsonb_build_object(
              'type', 'ticket',
              'record', jsonb_build_object('id', NEW.id, 'status', NEW.status, 'tier', NEW.tier, 'title', NEW.title)
            )
          );

          UPDATE public.tickets SET push_sent_at = now() WHERE id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $fn$
    `);

    // Older published rows must not be re-pushed by the scheduler
    await client.queryArray(`
      UPDATE public.tips SET push_sent_at = now()
      WHERE push_sent_at IS NULL AND status = 'published'
        AND (tip_date IS NULL OR tip_date <= (now() AT TIME ZONE 'Europe/Belgrade')::date)
    `);
    await client.queryArray(`
      UPDATE public.tickets SET push_sent_at = now()
      WHERE push_sent_at IS NULL AND status = 'published'
        AND (ticket_date IS NULL OR ticket_date <= (now() AT TIME ZONE 'Europe/Belgrade')::date)
    `);

    const SR_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    try { await client.queryArray(`SELECT cron.unschedule('send-scheduled-picks-push')`); } catch { /* not scheduled yet */ }
    await client.queryArray(`
      SELECT cron.schedule(
        'send-scheduled-picks-push',
        '*/15 * * * *',
        $cron$
        SELECT net.http_post(
          url := '${FN_BASE}/send-scheduled-picks-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ${SR_KEY}'),
          body := '{}'::jsonb
        ) AS request_id;
        $cron$
      )
    `);

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
});
