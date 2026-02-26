import { useState, useEffect } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

interface PushSubscriptionStatus {
  optedIn: boolean;
  subscriptionId: string | null;
}

/**
 * Query the real push subscription status from the Android native bridge.
 * Returns null on web or if the bridge method isn't available yet.
 */
export function getNativePushStatus(): PushSubscriptionStatus | null {
  if (!getIsAndroidApp()) return null;

  try {
    const raw = window.Android?.getPushSubscriptionStatus?.();
    if (!raw) {
      console.log("[PushStatus] Bridge method not available yet");
      return null;
    }
    const parsed = JSON.parse(raw) as PushSubscriptionStatus;
    console.log("[PushStatus] Native status:", parsed);
    return parsed;
  } catch (e) {
    console.warn("[PushStatus] Failed to parse native status:", e);
    return null;
  }
}

/**
 * Sync localStorage push flags with the real native subscription status.
 * Call this on login / app resume to ensure UI toggles reflect reality.
 *
 * Returns the native status if available, or null if bridge isn't ready.
 */
export function syncPushStatusFromNative(): PushSubscriptionStatus | null {
  const status = getNativePushStatus();
  if (!status) return null;

  if (!status.optedIn) {
    // Native says push is disabled — update localStorage to match
    const goalWasEnabled = localStorage.getItem("goal_enabled") === "true";
    const tipsWasEnabled = localStorage.getItem("tips_enabled") === "true";

    if (goalWasEnabled || tipsWasEnabled) {
      console.log("[PushStatus] Native optedIn=false, syncing localStorage flags to false");
      localStorage.setItem("goal_enabled", "false");
      localStorage.setItem("tips_enabled", "false");

      // Set disable timestamp if not already set
      if (!localStorage.getItem("push_disabled_at")) {
        localStorage.setItem("push_disabled_at", String(Date.now()));
      }
    }
  }

  return status;
}

/**
 * React hook that checks native push status on mount and syncs UI state.
 */
export function usePushSubscriptionStatus() {
  const [status, setStatus] = useState<PushSubscriptionStatus | null>(null);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;

    // Small delay to let bridge initialise
    const timer = setTimeout(() => {
      const result = syncPushStatusFromNative();
      setStatus(result);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAndroid]);

  return status;
}
