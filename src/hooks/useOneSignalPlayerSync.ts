import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Listens for ONESIGNAL_PLAYER_ID postMessage from the Android native bridge
 * and upserts the player ID into users_push_tokens for the logged-in user.
 * 
 * Handles the case where the Player ID arrives before the user logs in
 * by storing it and retrying on auth state changes.
 */
export function useOneSignalPlayerSync() {
  const isAndroid = getIsAndroidApp();
  const pendingPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAndroid) {
      console.log("[OneSignal] Not Android, skipping player sync");
      return;
    }

    console.log("[OneSignal] Android detected, setting up player ID listener");

    // Global debug listener - logs ALL messages to find OneSignal Player ID
    const debugListener = (event: MessageEvent) => {
      const d = event.data;
      if (typeof d === 'string' && d.includes('ONESIGNAL')) {
        console.log("[DEBUG RAW MESSAGE] string:", d);
      } else if (typeof d === 'object' && d !== null) {
        try {
          const json = JSON.stringify(d);
          if (json.includes('ONESIGNAL') || json.includes('playerId')) {
            console.log("[DEBUG RAW MESSAGE] object:", json);
          }
        } catch {}
      }
    };
    window.addEventListener("message", debugListener);

    const upsertPlayerToken = async (playerId: string) => {
      console.log("[OneSignal] upsertPlayerToken called with:", playerId);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log("[OneSignal] Player ID received but user not logged in, saving for later:", playerId);
        pendingPlayerIdRef.current = playerId;
        return;
      }

      console.log("[OneSignal] ▶ UPSERTING player ID:", playerId, "for user:", user.id, "platform: android");

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
      console.log("[OneSignal] ✅ Android push token saved successfully");
        localStorage.setItem("onesignal_player_id", playerId);
        pendingPlayerIdRef.current = null;
      }
    };

    const handleMessage = async (event: MessageEvent | Event) => {
      const rawData = (event as MessageEvent).data;

      console.log("[OneSignal] ANDROID MESSAGE RECEIVED:", rawData);
      console.log("[OneSignal] rawData type:", typeof rawData);
      try {
        console.log("[OneSignal] rawData JSON:", JSON.stringify(rawData));
      } catch (e) {
        console.log("[OneSignal] rawData not serializable");
      }

      const data =
        typeof rawData === "string"
          ? (() => {
              try { return JSON.parse(rawData); } catch { return null; }
            })()
          : rawData;

      if (!data) {
        console.log("[OneSignal] data is null after parsing");
        return;
      }
      if (data.type !== "ONESIGNAL_PLAYER_ID") {
        console.log("[OneSignal] Ignoring message type:", data.type);
        return;
      }
      if (!data.playerId) {
        console.log("[OneSignal] No playerId in message");
        return;
      }

      const playerId = data.playerId as string;
      console.log("[OneSignal] 🔥 Received Android Player ID:", playerId);

      await upsertPlayerToken(playerId);
    };

    // Listen on BOTH window and document for Android WebView compatibility
    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);

    // Auth state listener: flush pending player ID on ANY auth event with a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[OneSignal] onAuthStateChange:", event, "hasSession:", !!session?.user, "pendingId:", pendingPlayerIdRef.current);
        if (session?.user && pendingPlayerIdRef.current) {
          console.log("[OneSignal] 🔄 Auth event:", event, "- flushing pending Android player ID:", pendingPlayerIdRef.current);
          await upsertPlayerToken(pendingPlayerIdRef.current);
        }
      }
    );

    // Also check existing session immediately (WebView may already have a session without firing auth events)
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && pendingPlayerIdRef.current) {
        console.log("[OneSignal] Syncing saved Android Player ID after session restore");
        await upsertPlayerToken(pendingPlayerIdRef.current);
      }
    };
    checkExistingSession();

    return () => {
      window.removeEventListener("message", debugListener);
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as EventListener);
      subscription.unsubscribe();
    };
  }, [isAndroid]);
}
