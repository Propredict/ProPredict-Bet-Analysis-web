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
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isInCooldown(): boolean {
  try {
    const ts = window.sessionStorage?.getItem(COOLDOWN_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage?.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function useAndroidInterstitial() {
  const maybeShowInterstitial = useCallback((context: string) => {
    // Gate 1: Android only
    if (!getIsAndroidApp()) return;

    // Gate 2: 5-minute cooldown between interstitials
    if (isInCooldown()) return;

    // Gate 3: Bridge must exist
    if (!window.Android?.showInterstitial) return;

    // Fire the signal — Android handles actual ad logic & frequency caps
    (window.Android.showInterstitial as (ctx: string) => void)(context);
    markShown();
    console.log(`[Android] Interstitial requested: ${context}`);
  }, []);

  return { maybeShowInterstitial };
}
