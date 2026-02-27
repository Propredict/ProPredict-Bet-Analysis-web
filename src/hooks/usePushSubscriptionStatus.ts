import { useState, useEffect } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

export interface PushSubscriptionStatus {
  optedIn: boolean;
  subscriptionId: string | null;
}

export type PushState =
  | "no_permission"    // System permission denied → "Enable in Settings"
  | "opted_out"        // Permission exists but optedIn=false → soft reminder
  | "active"           // Both true → all good
  | "unknown";         // Bridge not available (web or bridge not ready)

/**
 * Query the real push subscription status from the Android native bridge.
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
 * Check system-level notification permission via bridge.
 */
export function hasNativeNotificationPermission(): boolean | null {
  if (!getIsAndroidApp()) return null;
  try {
    const result = window.Android?.hasNotificationPermission?.();
    console.log("[PushStatus] hasNotificationPermission:", result);
    return result ?? null;
  } catch (e) {
    console.warn("[PushStatus] hasNotificationPermission failed:", e);
    return null;
  }
}

/**
 * Re-enable push subscription (optIn) without re-requesting system permission.
 * Only works if system permission is already granted.
 */
export function enablePushViabridge() {
  try {
    window.Android?.enablePush?.();
    console.log("[PushStatus] enablePush called via bridge");
  } catch (e) {
    console.warn("[PushStatus] enablePush failed:", e);
  }
}

/**
 * Determine the combined push state from native bridge data.
 */
export function determinePushState(): PushState {
  const permission = hasNativeNotificationPermission();
  const status = getNativePushStatus();

  // Bridge not available
  if (permission === null || status === null) return "unknown";

  if (!permission) return "no_permission";
  if (!status.optedIn) return "opted_out";
  return "active";
}

/**
 * Sync localStorage push flags with the real native subscription status.
 */
/**
 * Query native push state WITHOUT modifying localStorage preferences.
 * User preferences (goal_enabled, tips_enabled) must only change from
 * explicit user actions (Settings toggles or Modal buttons), never
 * from an automatic background sync that might read stale SDK state.
 */
export function syncPushStatusFromNative(): PushState {
  const state = determinePushState();
  console.log("[PushStatus] Determined state:", state);
  // NO localStorage overwrites — only report state for UI display
  return state;
}

/**
 * React hook that checks native push status on mount and provides the combined state.
 */
export function usePushSubscriptionStatus() {
  const [pushState, setPushState] = useState<PushState>("unknown");
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;

    const timer = setTimeout(() => {
      const result = syncPushStatusFromNative();
      setPushState(result);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAndroid]);

  return pushState;
}
