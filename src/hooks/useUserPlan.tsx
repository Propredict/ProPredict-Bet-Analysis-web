import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/* =======================
   Types
======================= */

export type ContentTier = "free" | "daily" | "exclusive" | "premium";
export type ContentType = "tip" | "ticket";

export type UserPlan = "guest" | "free" | "pro" | "premium";

export type UnlockMethod =
  | { type: "unlocked" }
  | { type: "watch_ad" }
  | { type: "upgrade_basic" }
  | { type: "upgrade_premium" }
  | { type: "login_required" };

/* =======================
   Context
======================= */

interface UserPlanContextValue {
  plan: UserPlan;
  canAccess: (tier: ContentTier, type: ContentType, contentId: string) => boolean;
  getUnlockMethod: (tier: ContentTier, type: ContentType, contentId: string) => UnlockMethod;
  unlockContent: (type: ContentType, contentId: string) => Promise<boolean>;
}

const UserPlanContext = createContext<UserPlanContextValue | null>(null);

/* =======================
   Provider
======================= */

export function UserPlanProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  // 👉 OVO KASNIJE MENJAMO KAD POVEŽEŠ STRIPE
  const [plan, setPlan] = useState<UserPlan>("guest");

  useEffect(() => {
    if (!session) {
      setPlan("guest");
    } else {
      // trenutno: svaki ulogovan je FREE
      // kasnije: ovde čitaš iz Supabase (subscription)
      setPlan("free");
    }
  }, [session]);

  /* =======================
     ACCESS LOGIC
  ======================= */

  function canAccess(tier: ContentTier, _type: ContentType, _contentId: string): boolean {
    // ❌ Guest nema pristup ničemu
    if (plan === "guest") return false;

    // ✅ Premium vidi sve
    if (plan === "premium") return true;

    // ✅ Pro vidi sve osim premium
    if (plan === "pro") {
      return tier !== "premium";
    }

    // ❌ Free mora da otključa (ad)
    return false;
  }

  function getUnlockMethod(tier: ContentTier, _type: ContentType, _contentId: string): UnlockMethod {
    // 🔑 Guest → mora login
    if (plan === "guest") {
      return { type: "login_required" };
    }

    // ✅ Premium → sve otključano
    if (plan === "premium") {
      return { type: "unlocked" };
    }

    // ⭐ Pro → nema reklama
    if (plan === "pro") {
      if (tier === "premium") {
        return { type: "upgrade_premium" };
      }
      return { type: "unlocked" };
    }

    // 👤 Free user
    if (tier === "premium") {
      return { type: "upgrade_premium" };
    }

    // Daily + Exclusive → Watch Ad
    return { type: "watch_ad" };
  }

  async function unlockContent(_type: ContentType, _contentId: string): Promise<boolean> {
    // ovde će kasnije ići logika sa rewarded ads / Supabase
    toast.success("Content unlocked until midnight!");
    return true;
  }

  return (
    <UserPlanContext.Provider
      value={{
        plan,
        canAccess,
        getUnlockMethod,
        unlockContent,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

/* =======================
   Hook
======================= */

export function useUserPlan() {
  const ctx = useContext(UserPlanContext);
  if (!ctx) {
    throw new Error("useUserPlan must be used within UserPlanProvider");
  }
  return ctx;
}
