import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan, type ContentTier, type ContentType, type UnlockMethod } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

interface PendingUnlock {
  contentType: ContentType;
  contentId: string;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod, unlockContent } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const pendingUnlockRef = useRef<PendingUnlock | null>(null);

  // Listen for Android WebView messages
  useEffect(() => {
    if (!isAndroidApp) return;

    const handleMessage = async (event: MessageEvent) => {
      const { type } = event.data || {};

      if (type === "AD_UNLOCK_SUCCESS" && pendingUnlockRef.current) {
        const { contentType, contentId } = pendingUnlockRef.current;
        const success = await unlockContent(contentType, contentId);

        if (success) {
          toast.success(
            contentType === "tip" 
              ? "Thanks for watching! Tip unlocked." 
              : "Thanks for watching! Ticket unlocked."
          );
        }
        
        pendingUnlockRef.current = null;
        setUnlockingId(null);
      }

      if (type === "AD_UNLOCK_CANCELLED") {
        // Restore locked state silently - no error toast
        pendingUnlockRef.current = null;
        setUnlockingId(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isAndroidApp, unlockContent]);

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

      // Android ad-based unlock
      if (method.type === "watch_ad" || method.type === "android_watch_ad_or_pro") {
        // Prevent repeated clicks
        if (unlockingId === contentId) return false;

        setUnlockingId(contentId);
        pendingUnlockRef.current = { contentType, contentId };

        // Signal to Android WebView to show rewarded ad
        if (window.Android?.watchRewardedAd) {
          window.Android.watchRewardedAd();
        }

        return false; // Will be unlocked via message callback
      }

      if (method.type === "upgrade_basic") {
        // On Android, use native purchase flow
        if (isAndroidApp && window.Android?.buyPro) {
          window.Android.buyPro();
          return false;
        }
        // Web fallback
        if (options.onUpgradeBasic) {
          options.onUpgradeBasic();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      if (method.type === "upgrade_premium" || method.type === "android_premium_only") {
        // On Android, use native purchase flow
        if (isAndroidApp && window.Android?.buyPremium) {
          window.Android.buyPremium();
          return false;
        }
        // Web fallback
        if (options.onUpgradePremium) {
          options.onUpgradePremium();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      return false;
    },
    [getUnlockMethod, navigate, options, unlockingId, isAndroidApp]
  );

  // Secondary handler for Android "Buy Pro" button
  const handleSecondaryUnlock = useCallback(() => {
    // On Android, use native purchase flow
    if (isAndroidApp && window.Android?.buyPro) {
      window.Android.buyPro();
      return;
    }
    // Web fallback
    if (options.onUpgradeBasic) {
      options.onUpgradeBasic();
    } else {
      navigate("/get-premium");
    }
  }, [navigate, options, isAndroidApp]);

  return {
    unlockingId,
    handleUnlock,
    handleSecondaryUnlock,
    getUnlockMethod,
  };
}

// Type declaration for Android WebView interface
declare global {
  interface Window {
    Android?: {
      watchRewardedAd?: () => void;
      buyPro?: () => void;
      buyPremium?: () => void;
      requestEntitlements?: () => void;
      purchaseProduct?: (productId: string) => void;
    };
  }
}
