import { supabase } from "@/integrations/supabase/client";
import { getIsAndroidApp } from "@/hooks/usePlatform";

export type SureOddsEventType = "cta_click" | "checkout_started" | "unlocked";

/**
 * Fire-and-forget analytics for the Sure Odds 2+ Ticket funnel.
 * cta_click -> checkout_started -> unlocked
 */
export async function trackSureOddsEvent(
  eventType: SureOddsEventType,
  source: string
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;

    const { error } = await (supabase as any).from("sure_odds_events").insert({
      user_id: userId,
      event_type: eventType,
      source,
      platform: getIsAndroidApp() ? "android" : "web",
    });

    if (error) console.warn("[SureOddsAnalytics] insert failed:", error.message);
  } catch (e) {
    console.warn("[SureOddsAnalytics] error:", e);
  }
}

const UNLOCK_LOG_KEY = "propredict:sure-odds-unlock-logged";

/** Logs the successful unlock once per user per day. */
export function trackSureOddsUnlockOnce(userId: string, date: string, source: string) {
  const key = `${UNLOCK_LOG_KEY}:${userId}:${date}`;
  try {
    if (localStorage.getItem(key) === "1") return;
    localStorage.setItem(key, "1");
  } catch {
    // ignore storage errors, still log the event
  }
  void trackSureOddsEvent("unlocked", source);
}
