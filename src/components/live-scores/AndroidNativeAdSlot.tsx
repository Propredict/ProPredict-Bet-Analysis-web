/**
 * Android-only native ad placeholder.
 *
 * Renders a fixed-height container that the Android native layer
 * detects and fills with an inline native ad (ca-app-pub-4138787612808412/9395979295).
 * On web this component renders nothing.
 *
 * When the container scrolls into view, it signals the native layer
 * via window.Android.onLiveScoresView() so Android can render the ad.
 *
 * Shown for ALL Android users (FREE, PRO, PREMIUM).
 */

import { useEffect, useRef } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

interface AndroidNativeAdSlotProps {
  /** Unique slot id so native layer can target specific positions */
  slotIndex: number;
}

export function AndroidNativeAdSlot({ slotIndex }: AndroidNativeAdSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const hasFiredRef = useRef(false);

  // Gate: Android only
  const isAndroid = getIsAndroidApp();

  // Intersection Observer: signal native layer when slot becomes visible
  useEffect(() => {
    if (!isAndroid) return;
    if (!slotRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasFiredRef.current) {
          hasFiredRef.current = true;
          if ((window as any).Android?.onLiveScoresView) {
            (window as any).Android.onLiveScoresView();
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(slotRef.current);

    return () => observer.disconnect();
  }, [isAndroid]);

  // Don't render on web
  if (!isAndroid) return null;

  return (
    <div
      ref={slotRef}
      data-android-ad-slot={slotIndex}
      data-ad-unit-id="ca-app-pub-4138787612808412/9395979295"
      className="w-full flex items-center justify-center bg-secondary/30 border-y border-border/50"
      style={{ minHeight: 120 }}
      aria-hidden="true"
    />
  );
}
