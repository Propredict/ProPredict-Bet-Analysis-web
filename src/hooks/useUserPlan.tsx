import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/* =====================
   Types
===================== */

export type UserPlan = "free" | "basic" | "premium";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentType = "tip" | "ticket";

export type UnlockMethod =
  | { type: "unlocked" }
  | { type: "login_required"; message: "Sign in to unlock" }
  | { type: "watch_ad"; message: "Watch an ad to unlock" }
  | { type: "upgrade_basic"; message: "Upgrade to Basic" }
  | { type: "upgrade_premium"; message: "Upgrade to Premium" };

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
      const [profileRes, subRes, unlocksRes] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),

        supabase.from("user_subscriptions").select("plan, expires_at").eq("user_id", user.id).maybeSingle(),

        supabase
          .from("user_unlocks")
          .select("content_type, content_id, expires_at")
          .eq("user_id", user.id)
          .gte("expires_at", new Date().toISOString()),
      ]);

      /* ===== ADMIN OVERRIDE ===== */
      if (profileRes.data?.role === "admin") {
        setIsAdmin(true);
        setPlan("premium");
        setUnlockedContent([]);
        setIsLoading(false);
        return;
      }

      setIsAdmin(false);

      /* ===== UNLOCKED CONTENT ===== */
      if (Array.isArray(unlocksRes.data)) {
        setUnlockedContent(
          unlocksRes.data.map((u: any) => ({
            contentType: u.content_type,
            contentId: u.content_id,
            expiresAt: new Date(u.expires_at),
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

      if (tier === "daily" || tier === "exclusive") {
        if (plan === "basic" || plan === "premium") return true;
        if (contentType && contentId) {
          return isContentUnlocked(contentType, contentId);
        }
        return false;
      }

      if (tier === "premium") {
        return plan === "premium";
      }

      return false;
    },
    [isAdmin, plan, isContentUnlocked],
  );

  /* =====================
     UNLOCK METHOD (UI)
  ===================== */

  const getUnlockMethod = useCallback(
    (tier: ContentTier, contentType?: ContentType, contentId?: string): UnlockMethod | null => {
      if (isAdmin) return { type: "unlocked" };

      if (canAccess(tier, contentType, contentId)) {
        return { type: "unlocked" };
      }

      // GUEST
      if (!user) {
        return { type: "login_required", message: "Sign in to unlock" };
      }

      // DAILY + EXCLUSIVE → ADS for FREE users
      if ((tier === "daily" || tier === "exclusive") && plan === "free") {
        return { type: "watch_ad", message: "Watch an ad to unlock" };
      }

      // EXCLUSIVE → upgrade to basic (no ads)
      if (tier === "exclusive" && plan === "free") {
        return { type: "upgrade_basic", message: "Upgrade to Basic" };
      }

      // PREMIUM → ONLY premium
      if (tier === "premium") {
        return {
          type: "upgrade_premium",
          message: "Upgrade to Premium",
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

      const now = new Date();
      const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

      const { error } = await supabase.from("user_unlocks").insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        expires_at: endOfDay.toISOString(),
      });

      if (error && error.code !== "23505") {
        console.error("Unlock error:", error);
        return false;
      }

      setUnlockedContent((prev) => [...prev, { contentType, contentId, expiresAt: endOfDay }]);

      return true;
    },
    [user],
  );

  /* =====================
     Provider
  ===================== */

  return (
    <UserPlanContext.Provider
      value={{
        plan,
        isLoading,
        isAdmin,
        isAuthenticated: !!user,
        canAccess,
        getUnlockMethod,
        unlockContent,
        isContentUnlocked,
        refetch: fetchUserData,
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
