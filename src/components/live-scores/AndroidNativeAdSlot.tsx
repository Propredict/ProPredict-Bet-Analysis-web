/**
 * Android-only native ad placeholder.
 *
 * Renders an empty container with a data attribute that the Android
 * native layer detects and fills with an inline ad.
 * On web this component renders nothing.
 *
 * Only shown for FREE users — Pro & Premium see zero ads.
 */

import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useUserPlan } from "@/hooks/useUserPlan";

interface AndroidNativeAdSlotProps {
  /** Unique slot id so native layer can target specific positions */
  slotIndex: number;
}

export function AndroidNativeAdSlot({ slotIndex }: AndroidNativeAdSlotProps) {
  const { plan } = useUserPlan();

  // Gate 1: Android only
  if (!getIsAndroidApp()) return null;

  // Gate 2: Free users only — Pro & Premium see zero ads
  if (plan !== "free") return null;

  return (
    <div
      data-android-ad-slot={slotIndex}
      className="w-full min-h-[1px]"
      aria-hidden="true"
    />
  );
}
