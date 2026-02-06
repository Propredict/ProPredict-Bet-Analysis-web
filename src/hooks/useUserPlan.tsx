import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIsMobileApp } from "@/hooks/usePlatform";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { getPendingAdUnlock, clearPendingAdUnlock } from "@/hooks/pendingAdUnlock";
import { toast } from "sonner";

/* =====================
   Types
===================== */

export type UserPlan = "free" | "basic" | "premium";
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
   Context
===================== */

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

/* =====================
   Provider
===================== */

export function UserPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isMobileApp = getIsMobileApp();
  
  // RevenueCat integration for Android - source of truth for mobile subscriptions
  const revenueCat = useRevenueCat();

  const [plan, setPlan] = useState<UserPlan>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<UnlockedContent[]>([]);

  /* =====================
     Fetch User Data
  ===================== */

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setIsAdmin(false);
      setUnlockedContent([]);
      setIsLoading(false);
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

        supabase.from("user_subscriptions").select("plan, expires_at").eq("user_id", user.id).maybeSingle(),

        supabase
          .from("user_unlocks")
          .select("content_type, content_id, unlocked_date")
          .eq("user_id", user.id),
      ]);

      /* ===== ADMIN OVERRIDE ===== */
      if (adminRes.data?.role === "admin") {
        setIsAdmin(true);
        setPlan("premium");
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
      if (!subRes.data) {
        setPlan("free");
        setIsLoading(false);
        return;
      }

      if (subRes.data.expires_at) {
        const exp = new Date(subRes.data.expires_at);
        if (exp < new Date()) {
          setPlan("free");
          setIsLoading(false);
          return;
        }
      }

      setPlan(subRes.data.plan as UserPlan);
    } catch (err) {
      console.error("UserPlan error:", err);
      setPlan("free");
      setIsAdmin(false);
      setUnlockedContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  /* =====================
     Android RevenueCat Integration
     On Android, RevenueCat is the source of truth for subscriptions.
     Override the plan from Supabase with RevenueCat entitlements.
  ===================== */
  useEffect(() => {
    if (!isMobileApp) return;
    
    // When RevenueCat data is ready on Android, use it as the plan source
    if (!revenueCat.isLoading) {
      // Only override if user has an active RevenueCat subscription
      // This takes priority over Supabase (which is synced by backend webhook)
      if (revenueCat.hasActiveSubscription) {
        setPlan(revenueCat.plan);
      }
    }
  }, [isMobileApp, revenueCat.isLoading, revenueCat.plan, revenueCat.hasActiveSubscription]);

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

      if (tier === "free") return true;

      const isMobileApp = getIsMobileApp();

      // Daily tier access rules:
      // - WEB: Always accessible (monetized via AdSense)
      // - ANDROID: Requires Pro/Premium OR ad-unlock (checked via isContentUnlocked)
      if (tier === "daily") {
        // Web: always accessible
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
    [isAdmin, plan, isContentUnlocked],
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

      // Add to local state immediately
      const endOfDay = new Date(today + "T23:59:59Z");
      setUnlockedContent((prev) => [...prev, { contentType, contentId, expiresAt: endOfDay }]);

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

    const handleMessage = async (event: MessageEvent) => {
      const { type } = event.data || {};

      if (type === "AD_UNLOCK_SUCCESS") {
        const pending = getPendingAdUnlock();
        if (!pending) return;

        const { contentType, contentId } = pending;
        clearPendingAdUnlock();

        // Persist unlock to Supabase + update local state
        const success = await unlockContent(contentType, contentId);

        if (success) {
          toast.success(
            contentType === "tip"
              ? "Thanks for watching! Tip unlocked."
              : "Thanks for watching! Ticket unlocked."
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isMobileApp, unlockContent]);

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
