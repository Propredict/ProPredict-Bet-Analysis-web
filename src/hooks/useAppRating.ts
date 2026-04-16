import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const RATING_DISMISSED_KEY = "propredict:rating_dismissed_at";
const RATING_SHOWN_SESSION_KEY = "propredict:rating_shown_session";
const RATING_SHOWN_TOTAL_KEY = "propredict:rating_shown_total";
const RATING_LAST_SHOWN_KEY = "propredict:rating_last_shown_date";
const FIRST_SEEN_KEY = "propredict:first_seen_at";
const PICKS_VIEWED_KEY = "propredict:picks_viewed_session";
const AD_UNLOCK_KEY = "propredict:ad_unlock_done";
const RETURN_DAYS_KEY = "propredict:return_days";

const MAX_TOTAL_SHOWS = 999; // No total limit — show daily until rated
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h cooldown

export function useAppRating() {
  const { user } = useAuth();
  const isAndroid = getIsAndroidApp();
  const [showPopup, setShowPopup] = useState(false);
  const [hasRated, setHasRated] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Track return days
  useEffect(() => {
    if (!isAndroid) return;
    try {
      if (!localStorage.getItem(FIRST_SEEN_KEY)) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      }
      const today = new Date().toDateString();
      const stored = JSON.parse(localStorage.getItem(RETURN_DAYS_KEY) || "[]") as string[];
      if (!stored.includes(today)) {
        stored.push(today);
        localStorage.setItem(RETURN_DAYS_KEY, JSON.stringify(stored.slice(-30)));
      }
    } catch {}
  }, [isAndroid]);

  // Check if user already rated
  useEffect(() => {
    if (!user || !isAndroid) {
      setHasRated(null);
      return;
    }
    (supabase as any)
      .from("app_ratings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setHasRated(!!data);
      });
  }, [user, isAndroid]);

  // Check eligibility
  const checkTrigger = useCallback(() => {
    if (!isAndroid || !user || hasRated === null || hasRated) return;

    try {
      // Already shown this session
      if (sessionStorage.getItem(RATING_SHOWN_SESSION_KEY)) return;

      // Max total shows
      const totalShown = parseInt(localStorage.getItem(RATING_SHOWN_TOTAL_KEY) || "0", 10);
      if (totalShown >= MAX_TOTAL_SHOWS) return;

      // Max once per day
      const lastShownDate = localStorage.getItem(RATING_LAST_SHOWN_KEY);
      const today = new Date().toDateString();
      if (lastShownDate === today) return;

      // Dismiss cooldown (48h)
      const dismissedAt = localStorage.getItem(RATING_DISMISSED_KEY);
      if (dismissedAt && (Date.now() - parseInt(dismissedAt, 10)) < DISMISS_COOLDOWN_MS) return;

      // Check triggers: ad unlock OR 2+ picks viewed OR 2+ return days
      const adUnlocked = localStorage.getItem(AD_UNLOCK_KEY) === "1";
      const picksViewed = parseInt(sessionStorage.getItem(PICKS_VIEWED_KEY) || "0", 10);
      const returnDays = JSON.parse(localStorage.getItem(RETURN_DAYS_KEY) || "[]") as string[];

      const eligible = adUnlocked || picksViewed >= 2 || returnDays.length >= 2;
      if (!eligible) return;

      // Delay 3-5 seconds (random)
      const delay = 3000 + Math.random() * 2000;
      setTimeout(() => {
        setShowPopup(true);
        try {
          sessionStorage.setItem(RATING_SHOWN_SESSION_KEY, "1");
          localStorage.setItem(RATING_SHOWN_TOTAL_KEY, String(totalShown + 1));
          localStorage.setItem(RATING_LAST_SHOWN_KEY, today);
        } catch {}
      }, delay);
    } catch {}
  }, [isAndroid, user, hasRated]);

  useEffect(() => {
    checkTrigger();
  }, [checkTrigger]);

  // Call when user unlocks a pick via ad
  const markAdUnlock = useCallback(() => {
    if (!isAndroid) return;
    try { localStorage.setItem(AD_UNLOCK_KEY, "1"); } catch {}
  }, [isAndroid]);

  // Call when user views a pick
  const markPickViewed = useCallback(() => {
    if (!isAndroid) return;
    try {
      const count = parseInt(sessionStorage.getItem(PICKS_VIEWED_KEY) || "0", 10);
      sessionStorage.setItem(PICKS_VIEWED_KEY, String(count + 1));
    } catch {}
  }, [isAndroid]);

  // Legacy alias
  const markFeatureUsed = useCallback(() => {
    markAdUnlock();
  }, [markAdUnlock]);

  // Submit rating
  const submitRating = useCallback(async (stars: number, feedback?: string) => {
    if (!user) return { success: false, error: "not_authenticated" };
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("submit_app_rating", {
        p_stars: stars,
        p_feedback: feedback || null,
      });
      if (error) throw error;
      setHasRated(true);
      setShowPopup(false);
      return data as { success: boolean; rewarded: boolean; stars: number };
    } catch (err: any) {
      console.error("Rating submit error:", err);
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const dismiss = useCallback(() => {
    setShowPopup(false);
    try { localStorage.setItem(RATING_DISMISSED_KEY, String(Date.now())); } catch {}
  }, []);

  return {
    showPopup,
    hasRated,
    submitting,
    submitRating,
    dismiss,
    markFeatureUsed,
    markAdUnlock,
    markPickViewed,
    setShowPopup,
  };
}
