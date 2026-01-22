import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserPlan = "free" | "basic" | "premium";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentType = "tip" | "ticket";

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

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

export function UserPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unlockedContent, setUnlockedContent] = useState<UnlockedContent[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setIsAdmin(false);
      setUnlockedContent([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch profile role, subscription, and unlocks in parallel
      const [profileResult, subscriptionResult, unlocksResult] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("user_subscriptions")
          .select("plan, expires_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("user_unlocks")
          .select("content_type, content_id, expires_at")
          .eq("user_id", user.id)
          .gte("expires_at", new Date().toISOString())
      ]);

      // Check admin status
      if (profileResult.data?.role === "admin") {
        setIsAdmin(true);
        setPlan("premium");
        setUnlockedContent([]);
        setIsLoading(false);
        return;
      }

      setIsAdmin(false);

      // Handle unlocks
      if (unlocksResult.data && Array.isArray(unlocksResult.data)) {
        setUnlockedContent(
          unlocksResult.data.map((unlock: any) => ({
            contentType: unlock.content_type as ContentType,
            contentId: unlock.content_id,
            expiresAt: new Date(unlock.expires_at),
          }))
        );
      } else {
        setUnlockedContent([]);
      }

      // Handle subscription for non-admin users
      if (subscriptionResult.error) {
        console.error("Error fetching subscription:", subscriptionResult.error);
        setPlan("free");
        setIsLoading(false);
        return;
      }

      if (!subscriptionResult.data) {
        setPlan("free");
        setIsLoading(false);
        return;
      }

      // Check if subscription has expired
      if (subscriptionResult.data.expires_at) {
        const expiresAt = new Date(subscriptionResult.data.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          setPlan("free");
          setIsLoading(false);
          return;
        }
      }

      setPlan(subscriptionResult.data.plan as UserPlan);
    } catch (err) {
      console.error("Error in fetchUserData:", err);
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

  const isContentUnlocked = useCallback((contentType: ContentType, contentId: string): boolean => {
    const now = new Date();
    return unlockedContent.some(
      (unlock) =>
        unlock.contentType === contentType &&
        unlock.contentId === contentId &&
        unlock.expiresAt > now
    );
  }, [unlockedContent]);

  const canAccess = useCallback((tier: ContentTier, contentType?: ContentType, contentId?: string): boolean => {
    // Admins have full access to everything
    if (isAdmin) {
      return true;
    }

    switch (tier) {
      case "free":
        return true;
      case "daily":
        // Basic and Premium users have full access
        if (plan === "basic" || plan === "premium") {
          return true;
        }
        // Free users need per-content unlock
        if (contentType && contentId) {
          return isContentUnlocked(contentType, contentId);
        }
        return false;
      case "exclusive":
        // Basic and Premium users have full access
        if (plan === "basic" || plan === "premium") {
          return true;
        }
        // Free users need per-content unlock
        if (contentType && contentId) {
          return isContentUnlocked(contentType, contentId);
        }
        return false;
      case "premium":
        return plan === "premium";
      default:
        return false;
    }
  }, [isAdmin, plan, isContentUnlocked]);

  const getUnlockMethod = useCallback((tier: ContentTier, contentType?: ContentType, contentId?: string): UnlockMethod | null => {
    // Admins always see content as unlocked
    if (isAdmin) {
      return { type: "unlocked" };
    }

    // Check if already accessible
    if (canAccess(tier, contentType, contentId)) {
      return { type: "unlocked" };
    }

    // Guests need to sign in first for any gated content
    if (!user) {
      if (tier === "premium") {
        return { type: "upgrade_premium", message: "Upgrade to Premium" };
      }
      return { type: "login_required", message: "Sign in to unlock" };
    }

    switch (tier) {
      case "daily":
      case "exclusive":
        // Free users can watch ads for daily/exclusive content
        if (plan === "free") {
          return { type: "watch_ad", message: "Watch an ad to unlock" };
        }
        // Basic users need upgrade for exclusive (shouldn't reach here normally)
        return { type: "upgrade_basic", message: "Upgrade to Basic" };
      case "premium":
        // Premium content always requires upgrade - NO ads allowed
        return { type: "upgrade_premium", message: "Upgrade to Premium" };
      default:
        return null;
    }
  }, [isAdmin, user, plan, canAccess]);

  const unlockContent = useCallback(async (contentType: ContentType, contentId: string): Promise<boolean> => {
    if (!user) {
      console.error("User must be logged in to unlock content");
      return false;
    }

    // Simulate watching an ad (in real app, integrate with ad SDK)
    console.log("Simulating ad playback for:", contentType, contentId);

    try {
      // Calculate expiry at end of current UTC day
      const now = new Date();
      const endOfDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));

      const { error } = await (supabase as any)
        .from("user_unlocks")
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          expires_at: endOfDay.toISOString(),
        });

      if (error) {
        // If duplicate, content is already unlocked for today
        if (error.code === "23505") {
          console.log("Content already unlocked for today");
          return true;
        }
        console.error("Error unlocking content:", error);
        return false;
      }

      // Add to local state immediately for instant UI update
      setUnlockedContent((prev) => [
        ...prev,
        {
          contentType,
          contentId,
          expiresAt: endOfDay,
        },
      ]);

      return true;
    } catch (err) {
      console.error("Error in unlockContent:", err);
      return false;
    }
  }, [user]);

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

export function useUserPlan() {
  const context = useContext(UserPlanContext);
  if (context === undefined) {
    throw new Error("useUserPlan must be used within a UserPlanProvider");
  }
  return context;
}