/**
 * Android-only native ad placeholder.
 *
 * Renders a styled container that the Android native layer
 * detects via `data-android-ad-slot` and fills with an inline native ad.
 * On web this component renders nothing.
 *
 * Shown for ALL Android users (FREE, PRO, PREMIUM).
 */

import { useEffect, useRef } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { Sparkles } from "lucide-react";

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
      className="w-full rounded-lg overflow-hidden bg-gradient-to-r from-secondary/40 via-secondary/20 to-secondary/40 border border-border/40"
      style={{ minHeight: 140 }}
      aria-hidden="true"
    >
      {/* Placeholder content shown until native ad loads */}
      <div className="flex items-center justify-center h-full min-h-[140px] opacity-30">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium tracking-wide uppercase">Ad</span>
        </div>
      </div>
    </div>
  );
}
