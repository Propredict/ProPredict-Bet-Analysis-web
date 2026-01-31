import { useEffect, useRef } from "react";
import { usePlatform } from "@/hooks/usePlatform";

/**
 * Hook to trigger AdMob interstitial ads on Android.
 * Only triggers on Android WebView, does nothing on web.
 * 
 * Uses a ref to prevent multiple triggers on re-renders.
 * The ad will show once per page visit.
 */
export function useInterstitialAd() {
  const { isAndroidApp } = usePlatform();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Only trigger on Android and only once per mount
    if (!isAndroidApp || hasTriggered.current) return;

    // Small delay to let the page render first
    const timer = setTimeout(() => {
      if (window.Android?.showInterstitial) {
        window.Android.showInterstitial();
        hasTriggered.current = true;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAndroidApp]);
}
