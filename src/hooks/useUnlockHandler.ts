import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan, type ContentTier, type ContentType, type UnlockMethod } from "@/hooks/useUserPlan";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod, unlockContent } = useUserPlan();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleUnlock = useCallback(
    async (
      contentType: ContentType,
      contentId: string,
      tier: ContentTier
    ): Promise<boolean> => {
      const method = getUnlockMethod(tier, contentType, contentId);
      if (!method || method.type === "unlocked") return true;

      if (method.type === "login_required") {
        toast.info("Please sign in to unlock this content");
        navigate("/login");
        return false;
      }

      if (method.type === "watch_ad") {
        setUnlockingId(contentId);
        toast.info("Playing rewarded ad...", { duration: 2000 });

        // Simulate ad playback delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const success = await unlockContent(contentType, contentId);

        if (success) {
          toast.success(
            `${contentType === "tip" ? "Tip" : "Ticket"} unlocked! Valid until midnight UTC.`
          );
        } else {
          toast.error("Failed to unlock. Please try again.");
        }

        setUnlockingId(null);
        return success;
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
    [getUnlockMethod, unlockContent, navigate, options]
  );

  return {
    unlockingId,
    handleUnlock,
    getUnlockMethod,
  };
}
