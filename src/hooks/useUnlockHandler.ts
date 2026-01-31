import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan, type ContentTier, type ContentType, type UnlockMethod } from "@/hooks/useUserPlan";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

interface AdModalState {
  isOpen: boolean;
  contentType: ContentType | null;
  contentId: string | null;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod, unlockContent } = useUserPlan();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [adModal, setAdModal] = useState<AdModalState>({
    isOpen: false,
    contentType: null,
    contentId: null,
  });

  const handleAdComplete = useCallback(async () => {
    if (!adModal.contentType || !adModal.contentId) return;

    const success = await unlockContent(adModal.contentType, adModal.contentId);

    if (success) {
      toast.success(
        `${adModal.contentType === "tip" ? "Tip" : "Ticket"} unlocked! Valid until midnight UTC.`
      );
    } else {
      toast.error("Failed to unlock. Please try again.");
    }

    setUnlockingId(null);
  }, [adModal.contentType, adModal.contentId, unlockContent]);

  const closeAdModal = useCallback(() => {
    setAdModal({ isOpen: false, contentType: null, contentId: null });
  }, []);

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

      if (method.type === "watch_ad" || method.type === "android_watch_ad_or_pro") {
        setUnlockingId(contentId);
        // Open the ad modal instead of showing a toast
        setAdModal({
          isOpen: true,
          contentType,
          contentId,
        });
        return false; // Will be unlocked via modal callback
      }

      if (method.type === "upgrade_basic") {
        if (options.onUpgradeBasic) {
          options.onUpgradeBasic();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      if (method.type === "upgrade_premium" || method.type === "android_premium_only") {
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

  // Secondary handler for Android "Buy Pro" button
  const handleSecondaryUnlock = useCallback(() => {
    if (options.onUpgradeBasic) {
      options.onUpgradeBasic();
    } else {
      navigate("/get-premium");
    }
  }, [navigate, options]);

  return {
    unlockingId,
    handleUnlock,
    handleSecondaryUnlock,
    getUnlockMethod,
    // Ad modal state and handlers
    adModalOpen: adModal.isOpen,
    handleAdComplete,
    closeAdModal,
  };
}
