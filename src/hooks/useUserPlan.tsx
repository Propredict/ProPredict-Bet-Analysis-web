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
  | { type: "login_required"; message: string }
  | { type: "watch_ad"; message: string }
  | { type: "upgrade_basic"; message: string }
  | { type: "upgrade_premium"; message: string };

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
          .select("content_type, content_id, unlocked_date")
          .eq("user_id", user.id),
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

      // Daily tier: Always accessible for all users (monetized via AdSense)
      if (tier === "daily") {
        return true;
      }

      // Exclusive (Pro) tier: Requires basic or premium subscription
      if (tier === "exclusive") {
        if (plan === "basic" || plan === "premium") return true;
        return false;
      }

      // Premium tier: Requires premium subscription only
      if (tier === "premium") {
        return plan === "premium";
      }

      return false;
    },
    [isAdmin, plan],
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
