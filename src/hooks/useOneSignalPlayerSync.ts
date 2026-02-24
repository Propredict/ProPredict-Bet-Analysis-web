import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Listens for ONESIGNAL_PLAYER_ID postMessage from the Android native bridge
 * and upserts the player ID into users_push_tokens for the logged-in user.
 *
 * After reinstall the native bridge delivers a NEW player ID.
 * This hook:
 *  1. Always overwrites localStorage with the latest bridge value.
 *  2. Retries the upsert on every auth-state change until it succeeds.
 *  3. Runs a periodic retry so even if auth fires before the bridge message,
 *     the token is still synced within seconds.
 */
export function useOneSignalPlayerSync() {
  const isAndroid = getIsAndroidApp();
  const pendingPlayerIdRef = useRef<string | null>(null);
  const syncedRef = useRef(false); // true once DB upsert succeeds this session

  useEffect(() => {
    if (!isAndroid) return;

    console.log("[OneSignal] Android detected, setting up player ID listener");
    syncedRef.current = false;

    // ── Core upsert ──
    const upsertPlayerToken = async (playerId: string): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[OneSignal] No user yet, saving pending ID:", playerId);
        pendingPlayerIdRef.current = playerId;
        return false;
      }

      console.log("[OneSignal] ▶ UPSERTING player ID:", playerId, "for user:", user.id);

      const { error } = await supabase.from("users_push_tokens").upsert(
        {
          user_id: user.id,
          onesignal_player_id: playerId,
          platform: "android",
        },
        { onConflict: "user_id,platform" }
      );

      if (error) {
        console.error("[OneSignal] Upsert failed:", error.message);
        return false;
      }

      console.log("[OneSignal] ✅ Push token saved successfully");
      localStorage.setItem("onesignal_player_id", playerId);
      pendingPlayerIdRef.current = null;
      syncedRef.current = true;
      return true;
    };

    // ── Bridge message handler ──
    const handleMessage = async (event: MessageEvent | Event) => {
      const rawData = (event as MessageEvent).data;
      const data =
        typeof rawData === "string"
          ? (() => { try { return JSON.parse(rawData); } catch { return null; } })()
          : rawData;

      if (!data || data.type !== "ONESIGNAL_PLAYER_ID" || !data.playerId) return;

      const playerId = data.playerId as string;
      const previousId = localStorage.getItem("onesignal_player_id");

      // Always store the latest bridge value — critical after reinstall
      localStorage.setItem("onesignal_player_id", playerId);
      pendingPlayerIdRef.current = playerId;
      syncedRef.current = false; // force re-sync with new ID

      if (previousId && previousId !== playerId) {
        console.log("[OneSignal] 🔄 Player ID CHANGED (reinstall detected):", previousId, "→", playerId);
      } else {
        console.log("[OneSignal] 🔥 Received Android Player ID:", playerId);
      }

      await upsertPlayerToken(playerId);
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);

    // ── Auth state listener: flush pending player ID on login ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (syncedRef.current) return; // already synced this session
        const playerIdToSync = pendingPlayerIdRef.current || localStorage.getItem("onesignal_player_id");
        if (session?.user && playerIdToSync) {
          console.log("[OneSignal] 🔄 Auth event — syncing player ID for user:", session.user.id);
          await upsertPlayerToken(playerIdToSync);
        }
      }
    );

    // ── Immediate check: session may already exist ──
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const playerIdToSync = pendingPlayerIdRef.current || localStorage.getItem("onesignal_player_id");
      if (session?.user && playerIdToSync) {
        await upsertPlayerToken(playerIdToSync);
      }
    };
    checkExisting();

    // ── Periodic retry: bridge message may arrive after auth ──
    const retryInterval = setInterval(async () => {
      if (syncedRef.current) return;
      const playerIdToSync = pendingPlayerIdRef.current || localStorage.getItem("onesignal_player_id");
      if (playerIdToSync) {
        console.log("[OneSignal] ⏱ Retry sync for:", playerIdToSync);
        const ok = await upsertPlayerToken(playerIdToSync);
        if (ok) clearInterval(retryInterval);
      }
    }, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as EventListener);
      subscription.unsubscribe();
      clearInterval(retryInterval);
    };
  }, [isAndroid]);
}
