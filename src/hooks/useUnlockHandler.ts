import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserPlan, type ContentTier, type ContentType } from "@/hooks/useUserPlan";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod } = useUserPlan();

  const handleUnlock = useCallback(
    async (
      contentType: ContentType,
      contentId: string,
      tier: ContentTier
    ): Promise<boolean> => {
      const method = getUnlockMethod(tier);
      if (!method || method.type === "unlocked") return true;

      if (method.type === "login_required") {
        navigate("/login");
        return false;
      }

      if (method.type === "upgrade_basic") {
        if (options.onUpgradeBasic) {
          options.onUpgradeBasic();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      if (method.type === "upgrade_premium") {
        if (options.onUpgradePremium) {
          options.onUpgradePremium();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      return false;
    },
    [getUnlockMethod, navigate, options]
  );

  return {
    handleUnlock,
    getUnlockMethod,
  };
}
