/**
 * Shared pending ad-unlock store.
 *
 * `useUnlockHandler` writes the pending content info when the user
 * taps "Watch Ad".  `UserPlanProvider` reads it when Android posts
 * back `AD_UNLOCK_SUCCESS` via `window.postMessage`.
 *
 * Using a simple module-level variable keeps both hooks decoupled
 * without requiring a React context dependency.
 */

import type { ContentType } from "@/hooks/useUserPlan";

interface PendingAdUnlock {
  contentType: ContentType;
  contentId: string;
}

let pending: PendingAdUnlock | null = null;

export function setPendingAdUnlock(value: PendingAdUnlock | null) {
  pending = value;
}

export function getPendingAdUnlock(): PendingAdUnlock | null {
  return pending;
}

export function clearPendingAdUnlock() {
  pending = null;
}
