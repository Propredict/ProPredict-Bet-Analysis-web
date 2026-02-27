/**
 * Android-only interstitial ad helper.
 *
 * Rules:
 * - Only fires when running inside the Android WebView wrapper
 * - ALL Android users see interstitials (FREE, PRO, PREMIUM)
 * - Max 1 interstitial per 10-minute cooldown window (global, not per component)
 * - Blocked on auth routes and during login grace period
 */

import { useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

// Global module-level timestamp — shared across all hook instances
let lastShownAt = 0;
const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const LOGIN_GRACE_KEY = "propredict:login_ts";
const LOGIN_GRACE_MS = 20_000; // 20s after login



export function useAndroidInterstitial() {
  const maybeShowInterstitial = useCallback((context: string) => {
    // Gate 1: Android only
    if (!getIsAndroidApp()) return;

    // Gate 2: Block on auth pages
    const path = window.location.pathname;
    if (path === "/login" || path === "/forgot-password" || path === "/reset-password") return;

    // Gate 3: Login grace period (protects OneSignal permission dialog)
    try {
      const loginTs = localStorage.getItem(LOGIN_GRACE_KEY);
      if (loginTs && Date.now() - Number(loginTs) < LOGIN_GRACE_MS) {
        console.log("[Android] Interstitial blocked: login grace period");
        return;
      }
    } catch { /* ignore */ }

    // Gate 5: Global 3-minute frequency cap
    const now = Date.now();
    if (now - lastShownAt < MIN_INTERVAL_MS) return;

    // Gate 6: Bridge must exist
    if (!(window as any).Android?.showInterstitial) return;

    // Fire
    lastShownAt = now;
    ((window as any).Android.showInterstitial as (ctx: string) => void)(context);
    console.log(`[Android] Interstitial requested: ${context}`);
  }, []);

  return { maybeShowInterstitial };
}
