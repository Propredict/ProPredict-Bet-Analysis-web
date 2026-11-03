import type { ContentTier } from "@/hooks/useUserPlan";

/**
 * Signed-out visitors on the website can see Free / Daily tips and tickets.
 * Android guests must still sign in, and Pro/Premium stays locked.
 * AI prediction cards add their own sign-in requirement on top of this.
 */
export function guestCanView(tier: ContentTier, isMobileApp: boolean): boolean {
  if (isMobileApp) return false;
  return tier === "free" || tier === "daily";
}
