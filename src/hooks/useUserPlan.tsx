import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIsMobileApp } from "@/hooks/usePlatform";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { getPendingAdUnlock, clearPendingAdUnlock } from "@/hooks/pendingAdUnlock";
import { sendOrderConfirmationEmail } from "@/lib/sendPurchaseEmail";
import { toast } from "sonner";
import { setOneSignalTag } from "@/components/AndroidPushModal";

/* =====================
   Types
===================== */

export type UserPlan = "free" | "basic" | "premium";
export type SubscriptionSource = "free" | "stripe" | "google_play";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentType = "tip" | "ticket";

export type UnlockMethod =
  | { type: "unlocked" }
  | { type: "login_required"; message: string }
  | { type: "watch_ad"; message: string }
  | { type: "upgrade_basic"; message: string }
  | { type: "upgrade_premium"; message: string }
  | { type: "android_watch_ad_or_pro"; primaryMessage: string; secondaryMessage: string }
  | { type: "android_premium_only"; message: string };

interface UnlockedContent {
  contentType: ContentType;
  contentId: string;
  expiresAt: Date;
}

interface UserPlanContextType {
  plan: UserPlan;
  subscriptionSource: SubscriptionSource;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  canAccess: (tier: ContentTier, contentType?: ContentType, contentId?: string) => boolean;
  getUnlockMethod: (tier: ContentTier, contentType?: ContentType, contentId?: string) => UnlockMethod | null;
  unlockContent: (contentType: ContentType, contentId: string) => Promise<boolean>;
  isContentUnlocked: (contentType: ContentType, contentId: string) => boolean;
  refetch: () => Promise<void>;
}

/* =====================
   Helpers
===================== */

/** Sync plan + user_id tags to OneSignal for push segmentation */
function syncOneSignalPlanTags(plan: UserPlan, userId: string) {
  const planMap: Record<UserPlan, string> = { free: "free", basic: "pro", premium: "premium" };
  setOneSignalTag("plan", planMap[plan]);
  setOneSignalTag("user_id", userId);
}

/* =====================
   Context
===================== */

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

/* =====================
   Provider
===================== */

export function UserPlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isMobileApp = getIsMobileApp();
  
  // RevenueCat integration for Android - source of truth for mobile subscriptions
  const revenueCat = useRevenueCat(user?.id);

  const [plan, setPlan] = useState<UserPlan>("free");
  const [subscriptionSource, setSubscriptionSource] = useState<SubscriptionSource>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<UnlockedContent[]>([]);
  const purchaseEmailSentRef = useRef(false);

  /* =====================
     Fetch User Data
  ===================== */

  const fetchUserData = useCallback(async () => {
    // Guard: don't reset to "free" while auth is still refreshing the token.
    // Only treat as genuinely logged-out when authLoading is false.
    if (!user) {
      if (!authLoading) {
        setPlan("free");
        setSubscriptionSource("free");
        setIsAdmin(false);
        setUnlockedContent([]);
        setIsLoading(false);
      }
      return;
    }

    try {
      const [adminRes, subRes, unlocksRes] = await Promise.all([
        // Check admin role from user_roles table (proper security pattern)
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),

        supabase.from("user_subscriptions").select("*").eq("user_id", user.id).maybeSingle(),

        supabase
          .from("user_unlocks")
          .select("content_type, content_id, unlocked_date")
          .eq("user_id", user.id),
      ]);

      /* ===== ADMIN OVERRIDE ===== */
      if (adminRes.data?.role === "admin") {
        setIsAdmin(true);
        setPlan("premium");
        setSubscriptionSource("free");
        setUnlockedContent([]);
        setIsLoading(false);
        return;
      }

      setIsAdmin(false);

      /* ===== UNLOCKED CONTENT ===== */
      if (Array.isArray(unlocksRes.data)) {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const validUnlocks = unlocksRes.data.filter((u: any) => u.unlocked_date === today);
        setUnlockedContent(
          validUnlocks.map((u: any) => ({
            contentType: u.content_type as ContentType,
            contentId: u.content_id,
            expiresAt: new Date(u.unlocked_date + "T23:59:59Z"),
          })),
        );
      } else {
        setUnlockedContent([]);
      }

      /* ===== SUBSCRIPTION ===== */
      // On Android, RevenueCat is the sole source of truth for plan.
      // Only read subscription_source from Supabase; skip plan override.
      // IMPORTANT: Do NOT set isLoading=false here on Android — the RevenueCat
      // effect + Supabase fallback will handle it to avoid "flash of free".
      if (isMobileApp) {
        // Still read source from DB if available
        if (subRes.data) {
          setSubscriptionSource((subRes.data.subscription_source as SubscriptionSource) || "free");
        }
        // Plan is set by the RevenueCat effect below — do NOT overwrite or stop loading here
      } else if (!isMobileApp) {
        // WEB: Supabase is the source of truth
        if (!subRes.data) {
          setPlan("free");
          setSubscriptionSource("free");
          setIsLoading(false);
          return;
        }

        const isExpired = subRes.data.expires_at && new Date(subRes.data.expires_at) < new Date();
        const status = subRes.data.status || "active";
        const isCanceledButValid = status === "canceled" && subRes.data.expires_at && !isExpired;
        const isActive = status === "active" && !isExpired;

        if (!isActive && !isCanceledButValid) {
          setPlan("free");
          setSubscriptionSource("free");
          setIsLoading(false);
          return;
        }

        const resolvedPlan = subRes.data.plan as UserPlan;
        const resolvedSource = (subRes.data.subscription_source as SubscriptionSource) || "free";
        setPlan(resolvedPlan);
        setSubscriptionSource(resolvedSource);
      }

      // Sync plan + user_id tags to OneSignal for push segmentation
      // On Android, use revenueCat.plan; on web, use the resolved plan from Supabase
      const tagPlan = isMobileApp ? revenueCat.plan : plan;
      syncOneSignalPlanTags(tagPlan, user.id);
    } catch (err) {
      console.error("UserPlan error:", err);
      setPlan("free");
      setSubscriptionSource("free");
      setIsAdmin(false);
      setUnlockedContent([]);
    } finally {
      // On Android, don't set isLoading=false here — the RevenueCat effect handles it
      if (!isMobileApp) {
        setIsLoading(false);
      }
    }
  }, [user, authLoading, isMobileApp, revenueCat.isLoading, revenueCat.plan]);

  useEffect(() => {
    fetchUserData();
    // syncUser is now handled inside useRevenueCat when userId changes
  }, [fetchUserData, user]);

  /* =====================
     Android RevenueCat Integration
     On Android, RevenueCat is the source of truth for subscriptions.
     Override the plan from Supabase with RevenueCat entitlements.
     
     FALLBACK: After uninstall/reinstall, RevenueCat may not have cached
     entitlements yet and returns "free". If Supabase shows an active paid
     subscription, we trigger restorePurchases() and use the DB plan as
     an interim value until RevenueCat confirms.
  ===================== */
  const restoreTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isMobileApp || revenueCat.isLoading) return;

    // RevenueCat returned a paid plan — use it (primary source of truth)
    if (revenueCat.plan !== "free") {
      setPlan(revenueCat.plan);
      restoreTriggeredRef.current = false;
      if (user) syncOneSignalPlanTags(revenueCat.plan, user.id);
      return;
    }

    // RevenueCat says "free" — check if Supabase disagrees (reinstall scenario)
    if (!user) {
      setPlan("free");
      return;
    }

    // Restore already triggered: keep current interim plan and wait for RevenueCat sync
    if (restoreTriggeredRef.current) {
      return;
    }

    void (async () => {
      try {
        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan, status, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!data) {
          setPlan("free");
          syncOneSignalPlanTags("free", user.id);
          return;
        }

        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        const status = data.status || "active";
        const isActive = (status === "active" || status === "canceled") && !isExpired;

        if (isActive && data.plan !== "free") {
          console.log("[UserPlan] RevenueCat=free but Supabase=", data.plan, "— using DB plan as interim & triggering restorePurchases");
          // Use Supabase plan as interim so user isn't blocked
          setPlan(data.plan as UserPlan);
          syncOneSignalPlanTags(data.plan as UserPlan, user.id);

          // Trigger native restore so RevenueCat re-syncs
          const android = (window as any).Android as any;
          if (android?.restorePurchases) {
            restoreTriggeredRef.current = true;
            android.restorePurchases();
          }
        } else {
          setPlan("free");
          syncOneSignalPlanTags("free", user.id);
        }
      } catch (err) {
        console.error("[UserPlan] Failed to check Supabase fallback subscription:", err);
      }
    })();
  }, [isMobileApp, revenueCat.isLoading, revenueCat.plan, user]);

  /* =====================
     Android Ad-Unlock Event Listener
     Listens for 'ad-unlocked' event from Android WebView
     Event payload: { contentType, contentId, expiresAt }
  ===================== */
  useEffect(() => {
    const handleAdUnlocked = (event: CustomEvent<{ 
      contentType: ContentType; 
      contentId: string; 
      expiresAt: string;
    }>) => {
      const { contentType, contentId, expiresAt } = event.detail;
      const expiry = new Date(expiresAt);
      
      // Add to local unlocked content state
      setUnlockedContent((prev) => {
        // Check if already unlocked
        const exists = prev.some(
          (u) => u.contentType === contentType && u.contentId === contentId
        );
        if (exists) return prev;
        
        return [...prev, { contentType, contentId, expiresAt: expiry }];
      });
    };

    window.addEventListener('ad-unlocked', handleAdUnlocked as EventListener);
    
    return () => {
      window.removeEventListener('ad-unlocked', handleAdUnlocked as EventListener);
    };
  }, []);

  // NOTE: Global AD_UNLOCK_SUCCESS listener is defined below unlockContent.

  /* =====================
     Helpers
  ===================== */

  const isContentUnlocked = useCallback(
    (contentType: ContentType, contentId: string) => {
      const now = new Date();
      return unlockedContent.some(
        (u) => u.contentType === contentType && u.contentId === contentId && u.expiresAt > now,
      );
    },
    [unlockedContent],
  );

  /* =====================
     ACCESS RULES
  ===================== */

  const canAccess = useCallback(
    (tier: ContentTier, contentType?: ContentType, contentId?: string) => {
      if (isAdmin) return true;

      // Free tier: guests must sign in first
      if (tier === "free") {
        if (!user) return false;
        return true;
      }

      const isMobileApp = getIsMobileApp();

      // Daily tier access rules:
      // - Guests (not logged in): Must sign in first (both web & Android)
      // - WEB (logged in): Always accessible (monetized via AdSense)
      // - ANDROID: Requires Pro/Premium OR ad-unlock (checked via isContentUnlocked)
      if (tier === "daily") {
        // Guests must sign in to access daily content
        if (!user) return false;

        // Web: accessible once logged in
        if (!isMobileApp) return true;
        
        // Android: Pro/Premium users have full access
        if (plan === "basic" || plan === "premium") return true;
        
        // Android Free users: check if content was unlocked via ad
        if (contentType && contentId) {
          return isContentUnlocked(contentType, contentId);
        }
        
        return false;
      }

      // Exclusive (Pro) tier: Requires basic or premium subscription
      // On Android, free users can unlock via ads (checked via isContentUnlocked)
      if (tier === "exclusive") {
        if (plan === "basic" || plan === "premium") return true;
        
        // Android: check ad-unlock
        if (isMobileApp && contentType && contentId) {
          return isContentUnlocked(contentType, contentId);
        }
        
        return false;
      }

      // Premium tier: Requires premium subscription only (NO ad unlock option)
      if (tier === "premium") {
        return plan === "premium";
      }

      return false;
    },
    [isAdmin, user, plan, isContentUnlocked],
  );

  /* =====================
     UNLOCK METHOD (UI)
     
     Platform-aware unlock logic:
     - WEB: Subscription-based (no Watch Ad)
     - MOBILE APP: Rewarded ads for free users
  ===================== */

  const getUnlockMethod = useCallback(
    (tier: ContentTier, contentType?: ContentType, contentId?: string): UnlockMethod | null => {
      if (isAdmin) return { type: "unlocked" };

      if (canAccess(tier, contentType, contentId)) {
        return { type: "unlocked" };
      }

      const isMobileApp = getIsMobileApp();

      // GUEST - same on both platforms
      if (!user) {
        return { type: "login_required", message: "Sign in to unlock" };
      }

      /* =====================
         ANDROID APP LOGIC
         FREE users:
         - Daily: Watch Ad only
         - Exclusive/Pro: Watch Ad (primary) + Get Pro (secondary)
         - Premium: Get Premium only (NO ad option)
         
         PRO (basic) users:
         - Daily + Exclusive: Full access (no ads needed)
         - Premium: Get Premium only
         
         PREMIUM users:
         - Full access to everything (no ads)
      ===================== */
      if (isMobileApp) {
        // FREE user on Android
        if (plan === "free") {
          // Daily content: Watch Ad only
          if (tier === "daily") {
            return { type: "watch_ad", message: "Watch Ad to Unlock" };
          }
          
          // Exclusive/Pro content: Watch Ad + Get Pro option
          if (tier === "exclusive") {
            return { 
              type: "android_watch_ad_or_pro", 
              primaryMessage: "Watch Ad to Unlock",
              secondaryMessage: "Get Pro – No Ads"
            };
          }
          
          // Premium content: Get Premium only (no ad option)
          if (tier === "premium") {
            return { type: "android_premium_only", message: "Get Premium" };
          }
        }

        // PRO (basic) user on Android - Premium content only shows Get Premium
        if (plan === "basic" && tier === "premium") {
          return { type: "android_premium_only", message: "Get Premium" };
        }

        return null;
      }

      /* =====================
         WEB LOGIC (unchanged - no Watch Ad on web)
      ===================== */

      // EXCLUSIVE (Pro) → upgrade to basic for FREE users
      if (tier === "exclusive" && plan === "free") {
        return { type: "upgrade_basic", message: "Get Pro to unlock" };
      }

      // PREMIUM → upgrade to premium for FREE & BASIC users
      if (tier === "premium") {
        return {
          type: "upgrade_premium",
          message: "Get Premium to unlock",
        };
      }

      return null;
    },
    [isAdmin, user, plan, canAccess],
  );

  /* =====================
     UNLOCK CONTENT (ADS)
  ===================== */

  const unlockContent = useCallback(
    async (contentType: ContentType, contentId: string) => {
      if (!user) return false;

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { error } = await supabase.from("user_unlocks").insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        unlocked_date: today,
      });

      if (error && error.code !== "23505") {
        console.error("Unlock error:", error);
        return false;
      }

      // Add to local state (deduplicated)
      const endOfDay = new Date(today + "T23:59:59Z");
      setUnlockedContent((prev) => {
        const exists = prev.some(
          (u) => u.contentType === contentType && u.contentId === contentId
        );
        if (exists) return prev;
        return [...prev, { contentType, contentId, expiresAt: endOfDay }];
      });

      return true;
    },
    [user],
  );

  /* =====================
     GLOBAL AD_UNLOCK_SUCCESS Listener
     Android posts { type: "AD_UNLOCK_SUCCESS" } via window.postMessage.
     This handler runs at the provider level (always mounted) so it
     never misses the event regardless of which page is active.
  ===================== */
  useEffect(() => {
    if (!isMobileApp) return;

    const handleMessage = (event: MessageEvent) => {
      console.log("[UserPlan] postMessage received:", typeof event.data, JSON.stringify(event.data));
      const data = typeof event.data === "string" ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })() : event.data;
      const { type } = data || {};

      if (type === "AD_UNLOCK_SUCCESS") {
        console.log("[UserPlan] ✅ AD_UNLOCK_SUCCESS received!");
        const pending = getPendingAdUnlock();
        console.log("[UserPlan] pending ad-unlock:", JSON.stringify(pending));
        if (!pending) {
          console.warn("[UserPlan] ⚠️ No pending ad-unlock found — was it already cleared?");
          return;
        }

        const { contentType, contentId } = pending;
        clearPendingAdUnlock();
        console.log("[UserPlan] 🔓 Unlocking:", contentType, contentId);

        // IMMEDIATELY update local state for instant card re-render
        const today = new Date().toISOString().split("T")[0];
        const endOfDay = new Date(today + "T23:59:59Z");
        setUnlockedContent((prev) => {
          const next = [...prev, { contentType, contentId, expiresAt: endOfDay }];
          console.log("[UserPlan] 📦 unlockedContent updated, count:", next.length);
          return next;
        });

        toast.success(
          contentType === "tip"
            ? "Thanks for watching! Tip unlocked."
            : "Thanks for watching! Ticket unlocked."
        );

        // Persist to Supabase in the background, then refetch so view returns unmasked data
        unlockContent(contentType, contentId)
          .then((ok) => {
            console.log("[UserPlan] 💾 DB persist result:", ok);
            if (ok) {
              queryClient.invalidateQueries({ queryKey: ["tips"] });
              queryClient.invalidateQueries({ queryKey: ["tickets"] });
            }
          })
          .catch((err) =>
            console.error("[UserPlan] ❌ Failed to persist ad-unlock to DB:", err)
          );
      }

      // Handle RESTORE_SUCCESS / PURCHASE_SUCCESS from Android native layer
      // After a successful restore or purchase, RevenueCat webhook updates Supabase.
      // We re-fetch user data so the UI reflects the new plan immediately.
      if (
        type === "RESTORE_SUCCESS" ||
        type === "PURCHASE_SUCCESS" ||
        type === "REVENUECAT_PURCHASE_SUCCESS"
      ) {
        console.log("[UserPlan] Received", type, "— refreshing plan data");
        toast.success(
          type === "RESTORE_SUCCESS"
            ? "Purchases restored successfully!"
            : "Subscription activated!"
        );

        // Send order confirmation email (fire-and-forget, once per session)
        if (user && user.email && !purchaseEmailSentRef.current) {
          purchaseEmailSentRef.current = true;

          // Determine plan from RevenueCat or message data
          const purchasedPlan = revenueCat.plan; // "basic" or "premium" after entitlements refresh
          const planNameMap: Record<string, string> = { basic: "Pro", premium: "Premium" };
          const priceMap: Record<string, string> = { basic: "€3.99", premium: "€5.99" };
          const planName = planNameMap[purchasedPlan] || "Pro";
          const price = priceMap[purchasedPlan] || "€3.99";

          sendOrderConfirmationEmail({ email: user.email, planName, totalPrice: price });
        }

        // Small delay to let the RevenueCat webhook write to Supabase
        setTimeout(() => {
          fetchUserData();
          // Also refresh RevenueCat entitlements on the JS side
          revenueCat.refetch();
          // Invalidate React Query caches so UI updates immediately
          queryClient.invalidateQueries({ queryKey: ["tips"] });
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          queryClient.invalidateQueries({ queryKey: ["ai-predictions"] });
          queryClient.invalidateQueries({ queryKey: ["tip-accuracy"] });
          queryClient.invalidateQueries({ queryKey: ["tip-counts"] });
          queryClient.invalidateQueries({ queryKey: ["global-win-rate"] });
        }, 1500);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isMobileApp, unlockContent, fetchUserData, revenueCat, queryClient]);

  /* =====================
     Provider
  ===================== */

  /* =====================
     Combined refetch for both Supabase and RevenueCat
  ===================== */
  const handleRefetch = useCallback(async () => {
    await fetchUserData();
    // Also refresh RevenueCat entitlements on Android
    if (isMobileApp) {
      revenueCat.refetch();
    }
  }, [fetchUserData, isMobileApp, revenueCat]);

  // Combined loading state
  const combinedIsLoading = isLoading || (isMobileApp && revenueCat.isLoading);

  return (
    <UserPlanContext.Provider
      value={{
        plan,
        subscriptionSource,
        isLoading: combinedIsLoading,
        isAdmin,
        isAuthenticated: !!user,
        canAccess,
        getUnlockMethod,
        unlockContent,
        isContentUnlocked,
        refetch: handleRefetch,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

/* =====================
   Hook
===================== */

export function useUserPlan() {
  const ctx = useContext(UserPlanContext);
  if (!ctx) {
    throw new Error("useUserPlan must be used inside UserPlanProvider");
  }
  return ctx;
}
