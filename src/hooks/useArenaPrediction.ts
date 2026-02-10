import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseArenaPredictionOptions {
  dailyUsed: number;
  dailyLimit: number;
  tier: "free" | "pro" | "exclusive";
}

/** Derive market_type label from the user's pick string (client-side only) */
function deriveMarketLabel(pick: string): string {
  if (["Home", "Draw", "Away"].includes(pick)) return "Match Result";
  if (pick.startsWith("GG") || pick.startsWith("NG")) return "Both Teams to Score";
  if (pick.startsWith("Over") || pick.startsWith("Under")) return "Goals";
  return "Match Result";
}

export function useArenaPrediction(
  matchId: string,
  seasonId: string | null,
  matchTimestamp: string | null,
  options: UseArenaPredictionOptions
) {
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [userPick, setUserPick] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userMarketLabel, setUserMarketLabel] = useState<string | null>(null);
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

  /** Fetch existing prediction from DB — used on load AND after insert */
  const fetchExisting = useCallback(async () => {
    if (!user) return null;
    const { data } = await (supabase as any)
      .from("arena_predictions")
      .select("prediction, status")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .maybeSingle();
    return data as { prediction: string; status: string } | null;
  }, [user, matchId]);

  // Load existing prediction on mount + periodic refresh for status changes
  useEffect(() => {
    mountedRef.current = true;
    if (!user) { setLoaded(true); return; }

    const refresh = () => {
      fetchExisting().then((data) => {
        if (!mountedRef.current) return;
        if (data?.prediction) {
          setUserPick(data.prediction);
          setUserStatus(data.status || "pending");
          setUserMarketLabel(deriveMarketLabel(data.prediction));
        }
        setLoaded(true);
      }).catch(() => {});
    };

    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [user, matchId, fetchExisting]);

  const submitPick = useCallback(async (pick: string) => {
    if (!user || isKickedOff || submitting || isFree) return;
    if (userPick) return; // already locked
    if (limitReached) return;
    setSubmitting(true);

    // Optimistic lock — immediately show as locked
    setUserPick(pick);
    setUserStatus("pending");
    setUserMarketLabel(deriveMarketLabel(pick));

    try {
      // Get active season for season_id (required FK)
      const { data: season } = await (supabase as any)
        .from("active_arena_season")
        .select("id")
        .maybeSingle();

      if (!season?.id) {
        console.error("No active arena season found — cannot save prediction");
        // Rollback
        setUserPick(null);
        setUserStatus(null);
        setUserMarketLabel(null);
        setSubmitting(false);
        return;
      }

      // Direct insert using correct table columns
      const { error: insertError } = await (supabase as any)
        .from("arena_predictions")
        .insert({
          user_id: user.id,
          match_id: matchId,
          prediction: pick,
          season_id: season.id,
          status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint — already exists, keep locked
          console.log("Arena: duplicate prediction (23505), keeping locked");
        } else {
          console.error("Arena insert error:", insertError);
          // Rollback
          setUserPick(null);
          setUserStatus(null);
          setUserMarketLabel(null);
          setSubmitting(false);
          return;
        }
      }

      // Post-insert verification: refetch from DB to confirm persistence
      const verified = await fetchExisting();
      if (verified?.prediction) {
        setUserPick(verified.prediction);
        setUserStatus(verified.status || "pending");
        setUserMarketLabel(deriveMarketLabel(verified.prediction));
      } else {
        // DB doesn't have it — rollback
        console.error("Arena: post-insert verification failed, prediction not found in DB");
        setUserPick(null);
        setUserStatus(null);
        setUserMarketLabel(null);
      }
    } catch (e) {
      console.error("Arena prediction submit error:", e);
      setUserPick(null);
      setUserStatus(null);
      setUserMarketLabel(null);
    } finally {
      setSubmitting(false);
    }
  }, [user, matchId, isKickedOff, submitting, userPick, isFree, limitReached, fetchExisting]);

  const canPick = !isKickedOff && !!user && !isFree && !limitReached && !userPick;

  return { userPick, userStatus, userMarketLabel, submitPick, submitting, canPick, isKickedOff, loaded, isFree, limitReached };
}
