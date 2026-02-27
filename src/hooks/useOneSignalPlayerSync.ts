import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setOneSignalTag } from "@/components/AndroidPushModal";
import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Manages OneSignal player ID sync for Android.
 *
 * CRITICAL: This hook is 100% optional & non-blocking.
 * It must NEVER block auth, favorites, routing, or UI rendering.
 * All operations are fire-and-forget with try/catch.
 */
export function useOneSignalPlayerSync() {
  const isAndroid = getIsAndroidApp();
  const lastSyncedUserIdRef = useRef<string | null>(null);
  const lastSyncedPlayerIdRef = useRef<string | null>(null);
  const identitySyncedRef = useRef(false);

  useEffect(() => {
    if (!isAndroid) return;

    console.log("[OneSignal] Android detected, setting up player ID listener");

    // ── Core upsert — fully fire-and-forget, never blocks anything ──
    const upsertPlayerToken = async (playerId: string) => {
      try {
        // Use getSession (local, no network) instead of getUser (network call)
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          console.log("[OneSignal] No session yet, deferring sync");
          return;
        }

        if (lastSyncedUserIdRef.current === user.id && lastSyncedPlayerIdRef.current === playerId) {
          return;
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
          return;
        }

        console.log("[OneSignal] ✅ Push token saved successfully");
        try { localStorage.setItem("onesignal_player_id", playerId); } catch {}
        lastSyncedUserIdRef.current = user.id;
        lastSyncedPlayerIdRef.current = playerId;
      } catch (e) {
        console.error("[OneSignal] upsertPlayerToken error (non-blocking):", e);
      }
    };

    // ── Sync OneSignal identity — fire-and-forget ──
    const syncOneSignalIdentity = (userId: string) => {
      try {
        if (lastSyncedUserIdRef.current === userId) return;
        if (identitySyncedRef.current && lastSyncedUserIdRef.current === userId) return;

        if (window.Android?.syncUser) {
          window.Android.syncUser(userId);
          lastSyncedUserIdRef.current = userId;
          identitySyncedRef.current = true;
          console.log("[OneSignal] ✅ SYNC USER (once) →", userId);
        }
      } catch (e) {
        console.error("[OneSignal] syncUser bridge error (non-blocking):", e);
      }
    };

    // ── Bridge message handler ──
    const handleMessage = (event: MessageEvent | Event) => {
      try {
        const rawData = (event as MessageEvent).data;
        const data =
          typeof rawData === "string"
            ? (() => { try { return JSON.parse(rawData); } catch { return null; } })()
            : rawData;

        if (!data || data.type !== "ONESIGNAL_PLAYER_ID" || !data.playerId) return;

        const playerId = data.playerId as string;
        const previousId = localStorage.getItem("onesignal_player_id");

        try { localStorage.setItem("onesignal_player_id", playerId); } catch {}

        if (previousId && previousId !== playerId) {
          console.log("[OneSignal] 🔄 Player ID changed:", previousId, "→", playerId);

          const goalEnabled = localStorage.getItem("goal_enabled") === "true";
          const tipsEnabled = localStorage.getItem("tips_enabled") === "true";

          if (goalEnabled) setOneSignalTag("goal_alerts", "true");
          if (tipsEnabled) setOneSignalTag("daily_tips", "true");
          if (goalEnabled || tipsEnabled) {
            try { (window as any).Android?.enablePush?.(); } catch {}
          }

          lastSyncedPlayerIdRef.current = null;
        } else {
          console.log("[OneSignal] 🔥 Received Android Player ID:", playerId);
        }

        // Fire-and-forget — never await in event handler
        upsertPlayerToken(playerId).catch(() => {});
      } catch (e) {
        console.error("[OneSignal] handleMessage error (non-blocking):", e);
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);

    // ── Auth state listener: ONLY react to SIGNED_IN / SIGNED_OUT ──
    // All operations are fire-and-forget — never blocks auth flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        try {
          if (event === "SIGNED_IN" && session?.user) {
            const playerId = localStorage.getItem("onesignal_player_id");
            syncOneSignalIdentity(session.user.id);
            if (playerId) {
              // Fire-and-forget — never awaited
              upsertPlayerToken(playerId).catch(() => {});
            }

            const goalEnabled = localStorage.getItem("goal_enabled") === "true";
            const tipsEnabled = localStorage.getItem("tips_enabled") === "true";
            if (goalEnabled || tipsEnabled) {
              try { (window as any).Android?.enablePush?.(); } catch {}
            }
          }

          if (event === "SIGNED_OUT") {
            try { (window as any).Android?.logoutOneSignal?.(); } catch {}
            lastSyncedUserIdRef.current = null;
            lastSyncedPlayerIdRef.current = null;
            identitySyncedRef.current = false;
          }
        } catch (e) {
          console.error("[OneSignal] Auth listener error (non-blocking):", e);
        }
      }
    );

    // ── Initial check: handle existing session (cold start) — fire-and-forget ──
    const checkExisting = async () => {
      try {
        try {
          const w = window as any;
          if (w.Android?.getOneSignalPlayerId) {
            const nativeId = w.Android.getOneSignalPlayerId();
            if (nativeId && typeof nativeId === "string" && nativeId.length > 5) {
              const storedId = localStorage.getItem("onesignal_player_id");
              if (nativeId !== storedId) {
                try { localStorage.setItem("onesignal_player_id", nativeId); } catch {}
                lastSyncedPlayerIdRef.current = null;
              }
            }
          }
        } catch {}

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const playerId = localStorage.getItem("onesignal_player_id");
          syncOneSignalIdentity(session.user.id);
          if (playerId) {
            await upsertPlayerToken(playerId);
          }
        }
      } catch (e) {
        console.error("[OneSignal] checkExisting error (non-blocking):", e);
      }
    };
    checkExisting().catch(() => {});

    // ── Single delayed retry ──
    const retryTimer = setTimeout(() => {
      try {
        if (lastSyncedPlayerIdRef.current) return;
        const playerId = localStorage.getItem("onesignal_player_id");
        if (playerId) {
          upsertPlayerToken(playerId).catch(() => {});
        }
      } catch {}
    }, 5000);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as EventListener);
      subscription.unsubscribe();
      clearTimeout(retryTimer);
    };
  }, [isAndroid]);
}
