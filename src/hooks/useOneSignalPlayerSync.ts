import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Listens for ONESIGNAL_PLAYER_ID postMessage from the Android native bridge
 * and upserts the player ID into users_push_tokens for the logged-in user.
 * Only active on Android WebView.
 */
export function useOneSignalPlayerSync() {
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;

    const handleMessage = async (event: MessageEvent) => {
      const data =
        typeof event.data === "string"
          ? (() => {
              try {
                return JSON.parse(event.data);
              } catch {
                return null;
              }
            })()
          : event.data;

      if (!data || data.type !== "ONESIGNAL_PLAYER_ID" || !data.playerId) return;

      const playerId = data.playerId as string;

      // Only upsert if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("[OneSignal] Player ID received but user not logged in, skipping");
        return;
      }

      console.log("[OneSignal] Upserting player ID:", playerId, "for user:", user.id);

      const { error } = await supabase.from("users_push_tokens").upsert(
        {
          user_id: user.id,
          onesignal_player_id: playerId,
          platform: "android",
        },
        { onConflict: "user_id,platform" }
      );

      if (error) {
        console.error("[OneSignal] Failed to upsert push token:", error.message);
      } else {
        console.log("[OneSignal] Push token saved successfully");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isAndroid]);
}
