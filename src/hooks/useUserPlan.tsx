import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserPlan = "free" | "basic" | "premium";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";

interface UserPlanContextType {
  plan: UserPlan;
  isLoading: boolean;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserData = async () => {
    if (!user) {
      setPlan("free");
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch profile role and subscription in parallel
      const [profileResult, subscriptionResult] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("user_subscriptions")
          .select("plan, expires_at")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      // Check admin status
      if (profileResult.data?.role === "admin") {
        setIsAdmin(true);
        // Admins don't need subscription checks - they have full access
        setPlan("premium"); // Set to premium for UI consistency
        setIsLoading(false);
        return;
      }

      setIsAdmin(false);

      // Handle subscription for non-admin users
      if (subscriptionResult.error) {
        console.error("Error fetching subscription:", subscriptionResult.error);
        setPlan("free");
        setIsLoading(false);
        return;
      }

      // If no subscription row exists, user is on free plan
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

      // Valid subscription
      setPlan(subscriptionResult.data.plan as UserPlan);
    } catch (err) {
      console.error("Error in fetchUserData:", err);
      setPlan("free");
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const canAccess = (tier: ContentTier): boolean => {
    // Admins have full access to everything
    if (isAdmin) {
      return true;
    }

    switch (tier) {
      case "free":
        return true;
      case "daily":
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
    // Admins always see content as unlocked
    if (isAdmin) {
      return { type: "unlocked" };
    }

    if (canAccess(tier)) {
      return { type: "unlocked" };
    }

    switch (tier) {
      case "daily":
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
    <UserPlanContext.Provider value={{ plan, isLoading, isAdmin, canAccess, getUnlockMethod, refetch: fetchUserData }}>
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
