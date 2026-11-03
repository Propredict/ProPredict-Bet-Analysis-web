import type { ContentTier } from "@/hooks/useUserPlan";

/**
 * Signed-out visitors on the website can see Free / Daily content:
 * Free tips, Free tickets and Free AI predictions.
 * Android guests must still sign in, and Pro/Premium stays locked.
 */
export function guestCanView(tier: ContentTier, isMobileApp: boolean): boolean {
  if (isMobileApp) return false;
  return tier === "free" || tier === "daily";
}
