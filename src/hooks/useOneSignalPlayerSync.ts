import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setOneSignalTag } from "@/components/AndroidPushModal";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Manages OneSignal player ID sync for Android.
 *
 * Key principles:
 * 1. Supabase user_id is the master identity
 * 2. OneSignal login (syncUser) only on actual auth changes
 * 3. Push token upsert uses ON CONFLICT to prevent duplicates
 * 4. No re-login on foreground resume / re-render
 * 5. Multi-device support: same user can have tokens on multiple devices
 */
export function useOneSignalPlayerSync() {
  const isAndroid = getIsAndroidApp();
  // Persist across re-renders; reset only on actual SIGNED_OUT
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const lastSyncedPlayerIdRef = useRef<string | null>(null);
  // Session-level guard: survives re-renders AND re-mounts within same page session
  const identitySyncedRef = useRef(false);

  useEffect(() => {
    if (!isAndroid) return;

    console.log("[OneSignal] Android detected, setting up player ID listener");

    // ── Core upsert — uses INSERT ... ON CONFLICT instead of delete+insert ──
    const upsertPlayerToken = async (playerId: string): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[OneSignal] No user yet, deferring sync");
        return false;
      }

      // Skip if already synced this exact combo
      if (lastSyncedUserIdRef.current === user.id && lastSyncedPlayerIdRef.current === playerId) {
        return true;
      }

      console.log("[OneSignal] ▶ Upserting Android token for user:", user.id, "→", playerId);

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
      lastSyncedUserIdRef.current = user.id;
      lastSyncedPlayerIdRef.current = playerId;
      return true;
    };

    // ── Sync OneSignal identity — ONLY ONCE per session, ONLY on user change ──
    const syncOneSignalIdentity = (userId: string) => {
      // Guard 1: already synced this exact user (survives re-renders)
      if (lastSyncedUserIdRef.current === userId) {
        console.log("[OneSignal] Identity already synced for:", userId);
        return;
      }
      // Guard 2: session-level flag (prevents race between checkExisting + SIGNED_IN)
      if (identitySyncedRef.current && lastSyncedUserIdRef.current === userId) {
        console.log("[OneSignal] Identity sync already completed this session");
        return;
      }

      try {
        if (window.Android?.syncUser) {
          window.Android.syncUser(userId);
          lastSyncedUserIdRef.current = userId;
          identitySyncedRef.current = true;
          console.log("[OneSignal] ✅ SYNC USER (once) →", userId);
        } else {
          console.warn("[OneSignal] ⚠️ Android bridge not available for syncUser");
        }
      } catch (e) {
        console.error("[OneSignal] syncUser bridge error:", e);
      }
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

      localStorage.setItem("onesignal_player_id", playerId);

      if (previousId && previousId !== playerId) {
        console.log("[OneSignal] 🔄 Player ID CHANGED (reinstall detected):", previousId, "→", playerId);
        // Reset push preference flags so modal re-appears
        localStorage.removeItem("goal_enabled");
        localStorage.removeItem("tips_enabled");
        localStorage.removeItem("goal_prompt_last_shown");
        localStorage.removeItem("tips_prompt_last_shown");
        setOneSignalTag("goal_alerts", null);
        setOneSignalTag("daily_tips", null);
        // Force re-sync of token only (NOT identity — avoid login loop)
        lastSyncedPlayerIdRef.current = null;
        // DO NOT reset lastSyncedUserIdRef or identitySyncedRef here
        // The user hasn't changed, only the device token did
        console.log("[OneSignal] 🧹 Cleared push flags after reinstall (identity preserved)");
      } else {
        console.log("[OneSignal] 🔥 Received Android Player ID:", playerId);
      }

      await upsertPlayerToken(playerId);
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);

    // ── Auth state listener: only react to SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only sync on actual login events, NOT on token refresh or focus
        if (event === "SIGNED_IN" && session?.user) {
          const playerId = localStorage.getItem("onesignal_player_id");

          // Sync OneSignal identity — guards inside prevent duplicate calls
          syncOneSignalIdentity(session.user.id);

          if (playerId) {
            await upsertPlayerToken(playerId);
          }

          // Ensure subscription is active if user previously enabled push
          const goalEnabled = localStorage.getItem("goal_enabled") === "true";
          const tipsEnabled = localStorage.getItem("tips_enabled") === "true";
          if (goalEnabled || tipsEnabled) {
            try {
              (window as any).Android?.enablePush?.();
              console.log("[OneSignal] 🔔 SIGNED_IN → enablePush called");
            } catch (e) { /* ignore */ }
          }
        }

        if (event === "SIGNED_OUT") {
          // Reset native OneSignal identity so next login isn't blocked
          try {
            (window as any).Android?.logoutOneSignal?.();
            console.log("[OneSignal] 🔓 Native logoutOneSignal called");
          } catch (e) { /* ignore */ }

          lastSyncedUserIdRef.current = null;
          lastSyncedPlayerIdRef.current = null;
          identitySyncedRef.current = false;
        }
      }
    );

    // ── Initial check: handle existing session (cold start) ──
    const checkExisting = async () => {
      // Pull current Player ID from native bridge if available
      try {
        const w = window as any;
        if (w.Android?.getOneSignalPlayerId) {
          const nativeId = w.Android.getOneSignalPlayerId();
          if (nativeId && typeof nativeId === "string" && nativeId.length > 5) {
            const storedId = localStorage.getItem("onesignal_player_id");
            if (nativeId !== storedId) {
              console.log("[OneSignal] 🔄 Native bridge has NEW Player ID:", storedId, "→", nativeId);
              localStorage.setItem("onesignal_player_id", nativeId);
              lastSyncedPlayerIdRef.current = null; // force re-sync
            }
          }
        }
      } catch (e) {
        console.warn("[OneSignal] Failed to pull native Player ID:", e);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const playerId = localStorage.getItem("onesignal_player_id");
        syncOneSignalIdentity(session.user.id);
        if (playerId) {
          await upsertPlayerToken(playerId);
        }
      }
    };
    checkExisting();

    // ── Single delayed retry (bridge message may arrive after auth) ──
    const retryTimer = setTimeout(async () => {
      if (lastSyncedPlayerIdRef.current) return; // already synced
      const playerId = localStorage.getItem("onesignal_player_id");
      if (playerId) {
        console.log("[OneSignal] ⏱ Delayed retry for:", playerId);
        await upsertPlayerToken(playerId);
      }
    }, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as EventListener);
      subscription.unsubscribe();
      clearTimeout(retryTimer);
    };
  }, [isAndroid]);
}
