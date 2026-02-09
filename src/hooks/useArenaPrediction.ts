import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseArenaPredictionOptions {
  dailyUsed: number;
  dailyLimit: number;
  tier: "free" | "pro" | "exclusive";
}

/** Derive market_type from the user's pick string */
function deriveMarketType(pick: string): string {
  if (["Home", "Draw", "Away"].includes(pick)) return "match_result";
  if (pick.startsWith("GG") || pick.startsWith("NG")) return "btts";
  if (pick.startsWith("Over") || pick.startsWith("Under")) return "goals";
  return "match_result";
}

export function useArenaPrediction(
  matchId: string,
  seasonId: string | null,
  matchTimestamp: string | null,
  options: UseArenaPredictionOptions
) {
  const { user } = useAuth();
  const [userPick, setUserPick] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isKickedOff = (() => {
    if (!matchTimestamp) return false;
    const parts = matchTimestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!parts) return false;
    const local = new Date(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5]);
    return local <= new Date();
  })();
  const isFree = options.tier === "free";
  const limitReached = options.dailyUsed >= options.dailyLimit;

  // Load existing prediction (persist on refresh)
  useEffect(() => {
    if (!user) { setLoaded(true); return; }

    (supabase as any)
      .from("arena_predictions")
      .select("prediction")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.prediction) setUserPick(data.prediction);
        setLoaded(true);
      });
  }, [user, matchId]);

  const submitPick = useCallback(async (pick: string) => {
    if (!user || isKickedOff || submitting || isFree) return;
    if (userPick) return;
    if (limitReached) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc("insert_arena_prediction", {
        p_match_id: matchId,
        p_market_type: deriveMarketType(pick),
        p_selection: pick,
      });
      if (!error) {
        setUserPick(pick);
      } else if (error.code === "23505") {
        // Unique constraint — already predicted, just lock it
        setUserPick(pick);
      } else {
        console.error("Arena prediction RPC error:", error);
      }
    } catch (e) {
      console.error("Arena prediction submit error:", e);
    } finally {
      setSubmitting(false);
    }
  }, [user, matchId, isKickedOff, submitting, userPick, isFree, limitReached]);

  const canPick = !isKickedOff && !!user && !isFree && !limitReached && !userPick;

  return { userPick, submitPick, submitting, canPick, isKickedOff, loaded, isFree, limitReached };
}
