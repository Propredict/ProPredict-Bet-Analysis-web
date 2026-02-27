import { useEffect } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * In-feed native ad placeholder for Android.
 * Calls window.Android.toggleNativeAd(true) on mount,
 * and toggleNativeAd(false) on unmount.
 *
 * On web, renders nothing.
 * Must include "Sponsored" label per Google Play policy.
 */
export function NativeAdSlot() {
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;
    const bridge = (window as any).Android;
    if (!bridge?.toggleNativeAd) return;

    bridge.toggleNativeAd(true);

    return () => {
      bridge.toggleNativeAd(false);
    };
  }, [isAndroid]);

  // Only render on Android
  if (!isAndroid) return null;

  return (
    <div
      className="my-2 mx-1 rounded-lg border border-border/40 bg-card/30 p-3 text-center"
      aria-label="Sponsored content"
    >
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium">
        Sponsored
      </span>
      {/* Native ad content is rendered by Android overlay in this slot area */}
      <div className="h-[120px] flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground/40">Ad loading…</span>
      </div>
    </div>
  );
}
