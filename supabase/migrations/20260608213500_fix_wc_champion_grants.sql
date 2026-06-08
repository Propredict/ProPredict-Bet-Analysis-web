-- Fix permissions for WC champion prediction system.
GRANT SELECT ON public.wc_champion_settings TO anon, authenticated;
GRANT ALL ON public.wc_champion_settings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.wc_champion_predictions TO authenticated;
GRANT ALL ON public.wc_champion_predictions TO service_role;

GRANT EXECUTE ON FUNCTION public.cast_champion_vote(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_champion_prediction() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_champion_leaderboard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_champion_predictions(text, text, text, text) TO authenticated;

DROP POLICY IF EXISTS "Users insert own champion prediction" ON public.wc_champion_predictions;
CREATE POLICY "Users insert own champion prediction"
  ON public.wc_champion_predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own champion prediction" ON public.wc_champion_predictions;
CREATE POLICY "Users update own champion prediction"
  ON public.wc_champion_predictions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
