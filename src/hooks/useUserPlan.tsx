import { createContext, useContext, useState, ReactNode } from "react";

export type UserPlan = "free" | "basic" | "premium";
export type ContentTier = "free" | "daily" | "exclusive" | "premium";

interface UserPlanContextType {
  plan: UserPlan;
  setPlan: (plan: UserPlan) => void;
  canAccess: (tier: ContentTier) => boolean;
  getUnlockMethod: (tier: ContentTier) => UnlockMethod | null;
}

export type UnlockMethod = 
  | { type: "unlocked" }
  | { type: "watch_ad"; message: "Watch an ad to unlock" }
  | { type: "upgrade_basic"; message: "Upgrade to Basic" }
  | { type: "upgrade_premium"; message: "Upgrade to Premium" };

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

export function UserPlanProvider({ children }: { children: ReactNode }) {
  // Mocked user plan state - change this to test different scenarios
  const [plan, setPlan] = useState<UserPlan>("free");

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
    <UserPlanContext.Provider value={{ plan, setPlan, canAccess, getUnlockMethod }}>
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
