/**
 * Android-only interstitial ad helper.
 *
 * Rules:
 * - Only fires when running inside the Android WebView wrapper
 * - ALL Android users see interstitials (FREE, PRO, PREMIUM)
 * - Max 1 interstitial per 5-minute cooldown window
 *
 * Usage:
 *   const { maybeShowInterstitial } = useAndroidInterstitial();
 *   maybeShowInterstitial("home");
 */

import { useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const COOLDOWN_KEY = "propredict:interstitial_ts";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between interstitials
const LOGIN_GRACE_KEY = "propredict:login_ts";
const LOGIN_GRACE_MS = 20 * 1000; // 20s after login — no interstitials (protects OneSignal permission dialog)

function isInCooldown(): boolean {
  try {
    const ts = localStorage.getItem(COOLDOWN_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function useAndroidInterstitial() {
  const maybeShowInterstitial = useCallback((context: string) => {
    // Gate 1: Android only
    if (!getIsAndroidApp()) return;

    // Gate: Don't show on login/auth pages
    const path = window.location.pathname;
    if (path === "/login" || path === "/forgot-password" || path === "/reset-password") return;

    // Gate: Don't show during login grace period (protects OneSignal permission dialog from losing focus)
    try {
      const loginTs = localStorage.getItem(LOGIN_GRACE_KEY);
      if (loginTs && Date.now() - Number(loginTs) < LOGIN_GRACE_MS) {
        console.log("[Android] Interstitial blocked: login grace period active");
        return;
      }
    } catch { /* ignore */ }

    // Gate 2: 5-minute cooldown between interstitials
    if (isInCooldown()) return;

    // Gate 3: Bridge must exist
    if (!(window as any).Android?.showInterstitial) return;

    // Fire the signal — Android handles actual ad logic & frequency caps
    ((window as any).Android.showInterstitial as (ctx: string) => void)(context);
    markShown();
    console.log(`[Android] Interstitial requested: ${context}`);
  }, []);

  return { maybeShowInterstitial };
}
