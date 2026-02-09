import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Manages a single user's arena prediction for a given match.
 * Loads existing prediction, allows submitting one, and locks after kickoff.
 */
export function useArenaPrediction(matchId: string, seasonId: string | null, matchTimestamp: string | null) {
  const { user } = useAuth();
  const [userPick, setUserPick] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Check if match has kicked off
  const isKickedOff = matchTimestamp ? new Date(matchTimestamp) <= new Date() : false;

  // Load existing prediction
  useEffect(() => {
    if (!user || !seasonId) { setLoaded(true); return; }

    (supabase as any)
      .from("arena_predictions")
      .select("prediction")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .eq("season_id", seasonId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.prediction) setUserPick(data.prediction);
        setLoaded(true);
      });
  }, [user, matchId, seasonId]);

  const submitPick = useCallback(async (pick: string) => {
    if (!user || !seasonId || isKickedOff || submitting) return;
    // Don't allow changing an existing prediction
    if (userPick) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("arena_predictions")
        .insert({ user_id: user.id, match_id: matchId, season_id: seasonId, prediction: pick });
      if (!error) setUserPick(pick);
      else console.error("Arena prediction insert error:", error);
    } catch (e) {
      console.error("Arena prediction submit error:", e);
    } finally {
      setSubmitting(false);
    }
  }, [user, matchId, seasonId, isKickedOff, submitting, userPick]);

  const locked = isKickedOff && !!userPick;
  const canPick = !isKickedOff && !!seasonId && !!user;

  return { userPick, submitPick, submitting, locked, canPick, isKickedOff, loaded };
}
