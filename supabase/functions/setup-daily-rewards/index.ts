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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = token ? decodeJwtPayload(token) : null;

  if (payload?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const connectionString = Deno.env.get("SUPABASE_DB_URL");
  if (!connectionString) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not set" }), { status: 500, headers: corsHeaders });
  }

  const client = new Client(connectionString);

  try {
    await client.connect();
    await client.queryArray("begin");

    // Create table
    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS public.daily_reward_claims (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        claim_date date NOT NULL DEFAULT CURRENT_DATE,
        streak_day integer NOT NULL DEFAULT 1,
        points_earned integer NOT NULL DEFAULT 2,
        created_at timestamptz DEFAULT now(),
        UNIQUE(user_id, claim_date)
      )
    `);

    await client.queryArray(`ALTER TABLE public.daily_reward_claims ENABLE ROW LEVEL SECURITY`);

    // RLS policies (drop first to be idempotent)
    await client.queryArray(`DROP POLICY IF EXISTS "Users read own daily claims" ON public.daily_reward_claims`);
    await client.queryArray(`
      CREATE POLICY "Users read own daily claims"
        ON public.daily_reward_claims FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id)
    `);

    await client.queryArray(`DROP POLICY IF EXISTS "Users insert own daily claims" ON public.daily_reward_claims`);
    await client.queryArray(`
      CREATE POLICY "Users insert own daily claims"
        ON public.daily_reward_claims FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id)
    `);

    // claim_daily_reward RPC
    await client.queryArray(`
      CREATE OR REPLACE FUNCTION public.claim_daily_reward()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $fn$
      DECLARE
        v_user_id uuid := auth.uid();
        v_today date := CURRENT_DATE;
        v_yesterday date := CURRENT_DATE - 1;
        v_last_claim date;
        v_last_streak int;
        v_new_streak int;
        v_points int;
        v_already_claimed boolean;
        v_season_id uuid;
        v_user_plan text;
        v_bonus_reward text := 'none';
      BEGIN
        IF v_user_id IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
        END IF;

        SELECT EXISTS(
          SELECT 1 FROM daily_reward_claims
          WHERE user_id = v_user_id AND claim_date = v_today
        ) INTO v_already_claimed;

        IF v_already_claimed THEN
          RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
        END IF;

        SELECT claim_date, streak_day INTO v_last_claim, v_last_streak
        FROM daily_reward_claims
        WHERE user_id = v_user_id
        ORDER BY claim_date DESC
        LIMIT 1;

        IF v_last_claim = v_yesterday THEN
          IF v_last_streak >= 7 THEN
            v_new_streak := 1;
          ELSE
            v_new_streak := v_last_streak + 1;
          END IF;
        ELSE
          v_new_streak := 1;
        END IF;

        v_points := CASE v_new_streak
          WHEN 1 THEN 2
          WHEN 2 THEN 3
          WHEN 3 THEN 4
          WHEN 4 THEN 5
          WHEN 5 THEN 6
          WHEN 6 THEN 8
          WHEN 7 THEN 15
          ELSE 2
        END;

        -- Day 7 bonus: tiered by user plan
        IF v_new_streak = 7 THEN
          SELECT COALESCE(plan, 'free') INTO v_user_plan
          FROM user_subscriptions
          WHERE user_id = v_user_id
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > now())
          ORDER BY
            CASE plan WHEN 'premium' THEN 1 WHEN 'basic' THEN 2 ELSE 3 END
          LIMIT 1;

          v_user_plan := COALESCE(v_user_plan, 'free');

          IF v_user_plan = 'free' THEN
            -- Free users get 3 days Pro
            INSERT INTO user_subscriptions (user_id, plan, status, expires_at, subscription_source)
            VALUES (v_user_id, 'basic', 'active', now() + interval '3 days', 'streak_reward')
            ON CONFLICT (user_id) DO NOTHING;
            -- If user already has a subscription row, insert a new one
            IF NOT FOUND THEN
              UPDATE user_subscriptions
              SET plan = 'basic', status = 'active',
                  expires_at = now() + interval '3 days',
                  subscription_source = 'streak_reward',
                  updated_at = now()
              WHERE user_id = v_user_id
                AND (plan = 'free' OR status != 'active');
            END IF;
            v_bonus_reward := 'pro_3_days';

          ELSIF v_user_plan = 'basic' THEN
            -- Pro users get 1 day Premium
            UPDATE user_subscriptions
            SET plan = 'premium', status = 'active',
                expires_at = GREATEST(COALESCE(expires_at, now()), now()) + interval '1 day',
                subscription_source = 'streak_reward',
                updated_at = now()
            WHERE user_id = v_user_id
              AND status = 'active';
            v_bonus_reward := 'premium_1_day';

          ELSIF v_user_plan = 'premium' THEN
            -- Premium users get +8 extra bonus points
            v_points := v_points + 8;
            v_bonus_reward := 'bonus_points';
          END IF;
        END IF;

        INSERT INTO daily_reward_claims (user_id, claim_date, streak_day, points_earned)
        VALUES (v_user_id, v_today, v_new_streak, v_points);

        SELECT id INTO v_season_id FROM arena_seasons
        WHERE CURRENT_DATE BETWEEN starts_at AND ends_at
        LIMIT 1;

        IF v_season_id IS NOT NULL THEN
          INSERT INTO arena_user_stats (user_id, season_id, points)
          VALUES (v_user_id, v_season_id, v_points)
          ON CONFLICT (user_id, season_id)
          DO UPDATE SET points = arena_user_stats.points + v_points, updated_at = now();
        END IF;

        RETURN jsonb_build_object(
          'success', true,
          'streak_day', v_new_streak,
          'points_earned', v_points,
          'is_bonus_day', v_new_streak = 7,
          'bonus_reward', v_bonus_reward
        );
      END;
      $fn$
    `);

    // get_daily_reward_status RPC
    await client.queryArray(`
      CREATE OR REPLACE FUNCTION public.get_daily_reward_status()
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $fn$
      DECLARE
        v_user_id uuid := auth.uid();
        v_today date := CURRENT_DATE;
        v_yesterday date := CURRENT_DATE - 1;
        v_last_claim date;
        v_last_streak int;
        v_claimed_today boolean;
        v_current_streak int;
        v_total_points int;
      BEGIN
        IF v_user_id IS NULL THEN
          RETURN jsonb_build_object('claimed_today', false, 'current_streak', 0, 'total_points', 0);
        END IF;

        SELECT EXISTS(
          SELECT 1 FROM daily_reward_claims
          WHERE user_id = v_user_id AND claim_date = v_today
        ) INTO v_claimed_today;

        SELECT claim_date, streak_day INTO v_last_claim, v_last_streak
        FROM daily_reward_claims
        WHERE user_id = v_user_id
        ORDER BY claim_date DESC
        LIMIT 1;

        IF v_claimed_today THEN
          v_current_streak := COALESCE(v_last_streak, 0);
        ELSIF v_last_claim = v_yesterday THEN
          IF v_last_streak >= 7 THEN
            v_current_streak := 0;
          ELSE
            v_current_streak := v_last_streak;
          END IF;
        ELSE
          v_current_streak := 0;
        END IF;

        SELECT COALESCE(SUM(points_earned), 0) INTO v_total_points
        FROM daily_reward_claims
        WHERE user_id = v_user_id;

        RETURN jsonb_build_object(
          'claimed_today', v_claimed_today,
          'current_streak', v_current_streak,
          'total_points', v_total_points,
          'last_claim_date', v_last_claim,
          'last_streak_day', COALESCE(v_last_streak, 0)
        );
      END;
      $fn$
    `);

    // Schedule daily push reminder at 18:00 UTC (separate transaction)
    await client.queryArray("commit");
    await client.queryArray("begin");
    try {
      await client.queryArray(`SELECT cron.unschedule('daily-reward-push-reminder')`);
    } catch {
      await client.queryArray("rollback");
      await client.queryArray("begin");
    }

    await client.queryArray(`
      SELECT cron.schedule(
        'daily-reward-push-reminder',
        '0 18 * * *',
        $$
        SELECT net.http_post(
          url := 'https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/send-daily-reward-push',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA"}'::jsonb,
          body := '{}'::jsonb
        ) AS request_id;
        $$
      )
    `);

    await client.queryArray("commit");

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (error) {
    try { await client.queryArray("rollback"); } catch {}
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  } finally {
    await client.end();
  }
});
