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
import { useEffect } from "react";
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
]);

export function useAndroidNativeAd() {
  const { pathname } = useLocation();
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;
    const bridge = (window as any).Android;
    if (!bridge?.toggleNativeAd) return;

    const shouldShow = AD_ROUTES.has(pathname);
    bridge.toggleNativeAd(shouldShow);
  }, [pathname, isAndroid]);
}
