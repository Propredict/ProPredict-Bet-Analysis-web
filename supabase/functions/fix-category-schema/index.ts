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

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = token ? decodeJwtPayload(token) : null;

  if (payload?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const connectionString = Deno.env.get("SUPABASE_DB_URL");
  if (!connectionString) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL is not configured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const client = new Client(connectionString);

  try {
    await client.connect();
    await client.queryArray("begin");

    await client.queryArray(
      "alter table public.tips add column if not exists category text default null",
    );
    await client.queryArray(
      "alter table public.tickets add column if not exists category text default null",
    );

    await client.queryArray("drop view if exists public.tips_public");
    await client.queryArray(`
      create view public.tips_public
      with (security_invoker=on) as
      select
        odds,
        league,
        case
          when tier in ('free','daily') then prediction
          when public.user_has_min_plan(
            case
              when tier = 'exclusive' then 'basic'
              when tier = 'premium' then 'premium'
              else 'free'
            end
          ) then prediction
          when exists (
            select 1
            from public.user_unlocks u
            where u.user_id = auth.uid()
              and u.content_type = 'tip'
              and u.content_id = tips.id
          ) then prediction
          else '🔒'
        end as prediction,
        away_team,
        home_team,
        tier,
        status,
        result,
        tip_date,
        case
          when tier in ('free','daily') then ai_prediction
          when public.user_has_min_plan(
            case
              when tier = 'exclusive' then 'basic'
              when tier = 'premium' then 'premium'
              else 'free'
            end
          ) then ai_prediction
          when exists (
            select 1
            from public.user_unlocks u
            where u.user_id = auth.uid()
              and u.content_type = 'tip'
              and u.content_id = tips.id
          ) then ai_prediction
          else null
        end as ai_prediction,
        created_at_ts,
        updated_at,
        created_by,
        case
          when tier in ('free','daily') then confidence
          when public.user_has_min_plan(
            case
              when tier = 'exclusive' then 'basic'
              when tier = 'premium' then 'premium'
              else 'free'
            end
          ) then confidence
          when exists (
            select 1
            from public.user_unlocks u
            where u.user_id = auth.uid()
              and u.content_type = 'tip'
              and u.content_id = tips.id
          ) then confidence
          else null
        end as confidence,
        id,
        category
      from public.tips
      where status = 'published'
    `);

    await client.queryArray("drop view if exists public.tickets_public");
    await client.queryArray(`
      create view public.tickets_public
      with (security_invoker=on) as
      select
        updated_at,
        created_by,
        status,
        tier,
        ticket_date,
        id,
        case
          when tier in ('free','daily') then ai_analysis
          when public.user_has_min_plan(
            case
              when tier = 'exclusive' then 'basic'
              when tier = 'premium' then 'premium'
              else 'free'
            end
          ) then ai_analysis
          when exists (
            select 1
            from public.user_unlocks u
            where u.user_id = auth.uid()
              and u.content_type = 'ticket'
              and u.content_id = tickets.id
          ) then ai_analysis
          else null
        end as ai_analysis,
        title,
        description,
        result,
        total_odds,
        created_at_ts,
        category
      from public.tickets
      where status = 'published'
    `);

    const { rows: categoryColumns } = await client.queryObject<{ table_name: string; column_name: string }>(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('tickets', 'tips', 'tickets_public', 'tips_public')
        and column_name = 'category'
      order by table_name
    `);

    const { rows: viewDefinitions } = await client.queryObject<{ viewname: string; definition: string }>(`
      select viewname, definition
      from pg_views
      where schemaname = 'public'
        and viewname in ('tickets_public', 'tips_public')
      order by viewname
    `);

    await client.queryArray("commit");

    return new Response(
      JSON.stringify({
        ok: true,
        categoryColumns,
        views: viewDefinitions.map((view) => ({
          viewname: view.viewname,
          hasCategory: view.definition.includes("category"),
          hasUnlockCheck: view.definition.includes("user_unlocks"),
        })),
      }),
      { headers: corsHeaders },
    );
  } catch (error) {
    try {
      await client.queryArray("rollback");
    } catch {
      // no-op
    }

    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  } finally {
    await client.end();
  }
});