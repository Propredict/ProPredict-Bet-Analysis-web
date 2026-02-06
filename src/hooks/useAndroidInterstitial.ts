/**
 * Android-only interstitial ad helper.
 *
 * Rules:
 * - Only fires when running inside the Android WebView wrapper
 * - Only fires for FREE users (Pro & Premium see zero ads)
 * - At most ONE interstitial per app session (tracked via sessionStorage)
 *
 * Usage:
 *   const { maybeShowInterstitial } = useAndroidInterstitial();
 *   maybeShowInterstitial("home");
 */

import { useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useUserPlan } from "@/hooks/useUserPlan";

const SESSION_KEY = "propredict:interstitial_shown";

function hasShownThisSession(): boolean {
  try {
    return window.sessionStorage?.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage?.setItem(SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

export function useAndroidInterstitial() {
  const { plan } = useUserPlan();

  const maybeShowInterstitial = useCallback(
    (context: string) => {
      // Gate 1: Android only
      if (!getIsAndroidApp()) return;

      // Gate 2: Free users only — Pro & Premium see zero ads
      if (plan !== "free") return;

      // Gate 3: Max 1 per session
      if (hasShownThisSession()) return;

      // Gate 4: Bridge must exist
      if (!window.Android?.showInterstitial) return;

      // Fire the signal — Android handles actual ad logic & frequency caps
      (window.Android.showInterstitial as (ctx: string) => void)(context);
      markShown();
      console.log(`[Android] Interstitial requested: ${context}`);
    },
    [plan],
  );

  return { maybeShowInterstitial };
}
