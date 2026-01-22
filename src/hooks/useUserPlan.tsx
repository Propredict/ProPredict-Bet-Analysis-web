import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserPlan = "free" | "basic" | "premium";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";

interface UserPlanContextType {
  plan: UserPlan;
  isLoading: boolean;
  canAccess: (tier: ContentTier) => boolean;
  getUnlockMethod: (tier: ContentTier) => UnlockMethod | null;
  refetch: () => Promise<void>;
}

export type UnlockMethod = 
  | { type: "unlocked" }
  | { type: "watch_ad"; message: "Watch an ad to unlock" }
  | { type: "upgrade_basic"; message: "Upgrade to Basic" }
  | { type: "upgrade_premium"; message: "Upgrade to Premium" };

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

export function UserPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setPlan("free");
      setIsLoading(false);
      return;
    }

    try {
      // Using type assertion since user_subscriptions table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("user_subscriptions")
        .select("plan, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        setPlan("free");
        setIsLoading(false);
        return;
      }

      // If no subscription row exists, user is on free plan
      if (!data) {
        setPlan("free");
        setIsLoading(false);
        return;
      }

      // Check if subscription has expired
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          // Subscription expired, treat as free
          setPlan("free");
          setIsLoading(false);
          return;
        }
      }

      // Valid subscription
      setPlan(data.plan as UserPlan);
    } catch (err) {
      console.error("Error in fetchSubscription:", err);
      setPlan("free");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const canAccess = (tier: ContentTier): boolean => {
    switch (tier) {
      case "free":
        return true;
      case "daily":
        // Free users need to watch ad, but basic/premium get it unlocked
        return plan === "basic" || plan === "premium";
      case "exclusive":
        return plan === "basic" || plan === "premium";
      case "premium":
        return plan === "premium";
      default:
        return false;
    }
  };

  const getUnlockMethod = (tier: ContentTier): UnlockMethod | null => {
    if (canAccess(tier)) {
      return { type: "unlocked" };
    }

    switch (tier) {
      case "daily":
        // Free users can watch ad to unlock daily content
        return { type: "watch_ad", message: "Watch an ad to unlock" };
      case "exclusive":
        return { type: "upgrade_basic", message: "Upgrade to Basic" };
      case "premium":
        return { type: "upgrade_premium", message: "Upgrade to Premium" };
      default:
        return null;
    }
  };

  return (
    <UserPlanContext.Provider value={{ plan, isLoading, canAccess, getUnlockMethod, refetch: fetchSubscription }}>
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
