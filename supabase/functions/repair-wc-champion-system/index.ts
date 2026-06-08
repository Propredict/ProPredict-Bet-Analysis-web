import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const repairSql = `
CREATE TABLE IF NOT EXISTS public.wc_champion_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_deadline timestamptz NOT NULL DEFAULT '2026-06-23 23:59:59+00'::timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','resolved')),
  winner_team text,
  finalist_team text,
  third_place_team text,
  fourth_place_team text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wc_champion_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wc_champion_settings TO authenticated;
GRANT ALL ON public.wc_champion_settings TO service_role;

INSERT INTO public.wc_champion_settings (status)
SELECT 'open'
WHERE NOT EXISTS (SELECT 1 FROM public.wc_champion_settings);

ALTER TABLE public.wc_champion_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read champion settings" ON public.wc_champion_settings;
CREATE POLICY "Public read champion settings"
  ON public.wc_champion_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage champion settings" ON public.wc_champion_settings;
CREATE POLICY "Admin manage champion settings"
  ON public.wc_champion_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.wc_champion_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_name text NOT NULL,
  team_code text,
  team_flag text,
  is_correct boolean,
  reward_granted boolean NOT NULL DEFAULT false,
  reward_tier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wc_champion_predictions_user_unique UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.wc_champion_predictions TO authenticated;
GRANT ALL ON public.wc_champion_predictions TO service_role;

CREATE INDEX IF NOT EXISTS wc_champion_predictions_team_idx
  ON public.wc_champion_predictions(team_name);

ALTER TABLE public.wc_champion_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own champion prediction" ON public.wc_champion_predictions;
CREATE POLICY "Users read own champion prediction"
  ON public.wc_champion_predictions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin read all champion predictions" ON public.wc_champion_predictions;
CREATE POLICY "Admin read all champion predictions"
  ON public.wc_champion_predictions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own champion prediction" ON public.wc_champion_predictions;
CREATE POLICY "Users insert own champion prediction"
  ON public.wc_champion_predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own champion prediction" ON public.wc_champion_predictions;
CREATE POLICY "Users update own champion prediction"
  ON public.wc_champion_predictions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cast_champion_vote(
  p_team_name text,
  p_team_code text DEFAULT NULL,
  p_team_flag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings record;
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_team_name IS NULL OR length(trim(p_team_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_team');
  END IF;

  SELECT * INTO v_settings FROM public.wc_champion_settings LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.wc_champion_settings (status) VALUES ('open') RETURNING * INTO v_settings;
  END IF;

  IF v_settings.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'voting_closed');
  END IF;

  IF now() > v_settings.voting_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'deadline_passed');
  END IF;

  SELECT * INTO v_existing FROM public.wc_champion_predictions WHERE user_id = v_user_id;

  IF FOUND THEN
    UPDATE public.wc_champion_predictions
      SET team_name = p_team_name,
          team_code = p_team_code,
          team_flag = p_team_flag,
          updated_at = now()
      WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'updated', true, 'team', p_team_name);
  END IF;

  INSERT INTO public.wc_champion_predictions (user_id, team_name, team_code, team_flag)
  VALUES (v_user_id, p_team_name, p_team_code, p_team_flag);

  RETURN jsonb_build_object('success', true, 'updated', false, 'team', p_team_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_champion_leaderboard()
RETURNS TABLE(team_name text, team_code text, team_flag text, votes bigint, percentage numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (SELECT count(*)::numeric AS total FROM public.wc_champion_predictions)
  SELECT
    p.team_name,
    max(p.team_code) AS team_code,
    max(p.team_flag) AS team_flag,
    count(*)::bigint AS votes,
    CASE WHEN (SELECT total FROM totals) = 0 THEN 0
      ELSE round((count(*)::numeric / (SELECT total FROM totals)) * 100, 1)
    END AS percentage
  FROM public.wc_champion_predictions p
  GROUP BY p.team_name
  ORDER BY votes DESC, p.team_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_my_champion_prediction()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pick record;
  v_settings record;
BEGIN
  SELECT * INTO v_settings FROM public.wc_champion_settings LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_vote', false,
      'deadline', '2026-06-23 23:59:59+00'::timestamptz,
      'status', 'open',
      'winner_team', NULL
    );
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_vote', false,
      'deadline', v_settings.voting_deadline,
      'status', v_settings.status,
      'winner_team', v_settings.winner_team
    );
  END IF;

  SELECT * INTO v_pick FROM public.wc_champion_predictions WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'has_vote', FOUND,
    'team_name', v_pick.team_name,
    'team_code', v_pick.team_code,
    'team_flag', v_pick.team_flag,
    'is_correct', v_pick.is_correct,
    'reward_granted', v_pick.reward_granted,
    'reward_tier', v_pick.reward_tier,
    'deadline', v_settings.voting_deadline,
    'status', v_settings.status,
    'winner_team', v_settings.winner_team
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_champion_vote(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_champion_prediction() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_champion_leaderboard() TO anon, authenticated;

DROP TRIGGER IF EXISTS wc_champion_settings_updated_at ON public.wc_champion_settings;
CREATE TRIGGER wc_champion_settings_updated_at
  BEFORE UPDATE ON public.wc_champion_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS wc_champion_predictions_updated_at ON public.wc_champion_predictions;
CREATE TRIGGER wc_champion_predictions_updated_at
  BEFORE UPDATE ON public.wc_champion_predictions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

NOTIFY pgrst, 'reload schema';
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    await client.queryArray(repairSql);
    await client.queryArray("commit");

    const { rows } = await client.queryObject<{ routine_name: string }>(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE specific_schema = 'public'
        AND routine_name IN ('cast_champion_vote', 'get_my_champion_prediction', 'get_champion_leaderboard')
      ORDER BY routine_name
    `);

    return new Response(JSON.stringify({ ok: true, functions: rows.map((row) => row.routine_name) }), {
      headers: corsHeaders,
    });
  } catch (error) {
    try {
      await client.queryArray("rollback");
    } catch {
      // no-op
    }

    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  } finally {
    await client.end();
  }
});