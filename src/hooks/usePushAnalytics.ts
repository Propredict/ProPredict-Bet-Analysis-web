import { supabase } from "@/integrations/supabase/client";
import { determinePushState } from "@/hooks/usePushSubscriptionStatus";

type PushAction =
  | "goal_enabled"
  | "goal_disabled"
  | "tips_enabled"
  | "tips_disabled";

/**
 * Log a push preference change to Supabase for analytics.
 * Fire-and-forget — errors are silently logged to console.
 */
export async function logPushPreferenceChange(
  action: PushAction,
  source: "settings" | "modal" = "settings"
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[PushAnalytics] No user logged in, skipping log");
      return;
    }

    const pushState = determinePushState();

    const { error } = await supabase
      .from("push_preference_logs" as any)
      .insert({
        user_id: user.id,
        action,
        push_state: pushState,
        source,
      });

    if (error) {
      console.warn("[PushAnalytics] Failed to log:", error.message);
    } else {
      console.log("[PushAnalytics] Logged:", action, pushState, source);
    }
  } catch (e) {
    console.warn("[PushAnalytics] Error:", e);
  }
}
