import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const OPEN_COUNT_KEY = "propredict:app_open_count";
const FEATURE_USED_KEY = "propredict:feature_used_for_rating";
const RATING_DISMISSED_KEY = "propredict:rating_dismissed_at";
const RATING_SHOWN_SESSION_KEY = "propredict:rating_shown_session";
const FIRST_SEEN_KEY = "propredict:first_seen_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_DAYS_BEFORE_PROMPT = 3;

export function useAppRating() {
  const { user } = useAuth();
  const isAndroid = getIsAndroidApp();
  const [showPopup, setShowPopup] = useState(false);
  const [hasRated, setHasRated] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Track app opens
  useEffect(() => {
    if (!isAndroid) return;
    try {
      const count = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || "0", 10);
      localStorage.setItem(OPEN_COUNT_KEY, String(count + 1));
      // Track first ever app open
      if (!localStorage.getItem(FIRST_SEEN_KEY)) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
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

  // Determine if popup should show
  const checkTrigger = useCallback(() => {
    if (!isAndroid || !user || hasRated === null || hasRated) return;

    // Don't show if already dismissed or shown this session
    try {
      if (sessionStorage.getItem(RATING_SHOWN_SESSION_KEY)) return;
      // Check dismiss cooldown (7 days)
      const dismissedAt = localStorage.getItem(RATING_DISMISSED_KEY);
      if (dismissedAt && (Date.now() - parseInt(dismissedAt, 10)) < DISMISS_COOLDOWN_MS) return;
    } catch {}

    const openCount = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || "0", 10);
    const featureUsed = localStorage.getItem(FEATURE_USED_KEY) === "1";
    const firstSeen = parseInt(localStorage.getItem(FIRST_SEEN_KEY) || "0", 10);
    const daysSinceFirstUse = firstSeen ? (Date.now() - firstSeen) / (24 * 60 * 60 * 1000) : 0;

    if (openCount >= 3 || featureUsed || daysSinceFirstUse >= MIN_DAYS_BEFORE_PROMPT) {
      // Delay to not interfere with other popups
      setTimeout(() => {
        setShowPopup(true);
        try { sessionStorage.setItem(RATING_SHOWN_SESSION_KEY, "1"); } catch {}
      }, 5000);
    }
  }, [isAndroid, user, hasRated]);

  useEffect(() => {
    checkTrigger();
  }, [checkTrigger]);

  // Mark a key feature as used (call from AI Picks, Daily Reward, etc.)
  const markFeatureUsed = useCallback(() => {
    if (!isAndroid) return;
    try { localStorage.setItem(FEATURE_USED_KEY, "1"); } catch {}
  }, [isAndroid]);

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
    try { localStorage.setItem(RATING_DISMISSED_KEY, "1"); } catch {}
  }, []);

  return {
    showPopup,
    hasRated,
    submitting,
    submitRating,
    dismiss,
    markFeatureUsed,
    setShowPopup,
  };
}
