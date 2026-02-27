/**
 * Tells the Android native layer to show/hide the bottom native ad banner
 * based on the current route.
 *
 * Pages WITH native ad:
 *   /daily-analysis, /pro-analysis, /premium-analysis
 *   /daily-predictions, /pro-predictions, /premium-predictions
 *   /winning-history
 *
 * All other pages: native ad hidden.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const AD_ROUTES = new Set([
  "/daily-analysis",
  "/pro-analysis",
  "/premium-analysis",
  "/daily-predictions",
  "/pro-predictions",
  "/premium-predictions",
  "/winning-history",
  "/live-scores",
  "/ai-predictions",
]);

const NATIVE_AD_COOLDOWN_KEY = "propredict:native_ad_ts";
const NATIVE_AD_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function isNativeAdInCooldown(): boolean {
  try {
    const ts = localStorage.getItem(NATIVE_AD_COOLDOWN_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < NATIVE_AD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markNativeAdShown(): void {
  try {
    localStorage.setItem(NATIVE_AD_COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function useAndroidNativeAd() {
  const { pathname } = useLocation();
  const isAndroid = getIsAndroidApp();
  const isShowingRef = useRef(false);

  useEffect(() => {
    if (!isAndroid) return;
    const bridge = (window as any).Android;
    if (!bridge?.toggleNativeAd) return;

    const shouldShow = AD_ROUTES.has(pathname);

    if (shouldShow && !isNativeAdInCooldown()) {
      bridge.toggleNativeAd(true);
      isShowingRef.current = true;
      markNativeAdShown();
    } else {
      bridge.toggleNativeAd(false);
      isShowingRef.current = false;
    }

    return () => {
      if (isShowingRef.current) {
        bridge.toggleNativeAd(false);
        isShowingRef.current = false;
      }
    };
  }, [pathname, isAndroid]);
}
