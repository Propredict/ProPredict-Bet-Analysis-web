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

  // Listen for Android WebView messages (AD_UNLOCK_SUCCESS / AD_UNLOCK_CANCELLED)
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

  /**
   * Main unlock handler - call this when user clicks the primary unlock button
   * Returns true if already unlocked, false if unlock is in progress or redirect happened
   */
  const handleUnlock = useCallback(
    async (
      contentType: ContentType,
      contentId: string,
      tier: ContentTier
    ): Promise<boolean> => {
      const method = getUnlockMethod(tier, contentType, contentId);
      if (!method || method.type === "unlocked") return true;

      // Login required - redirect to login
      if (method.type === "login_required") {
        toast.info("Please sign in to unlock this content");
        navigate("/login");
        return false;
      }

      // Android: Watch Ad to unlock (Daily tier OR primary action for Exclusive)
      if (method.type === "watch_ad" || method.type === "android_watch_ad_or_pro") {
        // Prevent repeated clicks while ad is showing
        if (unlockingId === contentId) return false;

        setUnlockingId(contentId);
        pendingUnlockRef.current = { contentType, contentId };

        // Call Android native bridge to show rewarded ad
        if (window.Android?.watchRewardedAd) {
          window.Android.watchRewardedAd();
        }

        return false; // Will be unlocked via AD_UNLOCK_SUCCESS message callback
      }

      // Android: Premium only - call native purchase flow
      if (method.type === "android_premium_only") {
        if (isAndroidApp && window.Android?.getPremium) {
          window.Android.getPremium();
        } else if (isAndroidApp && window.Android?.buyPremium) {
          // Fallback to buyPremium if getPremium doesn't exist
          window.Android.buyPremium();
        } else {
          // Web fallback (shouldn't happen on Android)
          navigate("/get-premium");
        }
        return false;
      }

      // Web: Upgrade to Basic (Pro) subscription
      if (method.type === "upgrade_basic") {
        if (options.onUpgradeBasic) {
          options.onUpgradeBasic();
        } else {
          navigate("/get-premium");
        }
        return false;
      }

      // Web: Upgrade to Premium subscription
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
    [getUnlockMethod, navigate, options, unlockingId, isAndroidApp]
  );

  /**
   * Secondary handler for Android "Get Pro" button (used in android_watch_ad_or_pro layout)
   * Calls native purchase flow for Pro subscription
   */
  const handleSecondaryUnlock = useCallback(() => {
    if (isAndroidApp) {
      // Call Android native Pro purchase flow
      if (window.Android?.getPro) {
        window.Android.getPro();
        return;
      }
      if (window.Android?.buyPro) {
        // Fallback to buyPro if getPro doesn't exist
        window.Android.buyPro();
        return;
      }
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
      showInterstitial?: () => void;
      watchRewardedAd?: () => void;
      buyPro?: () => void;
      buyPremium?: () => void;
      getPro?: () => void;
      getPremium?: () => void;
      requestEntitlements?: () => void;
      purchaseProduct?: (productId: string) => void;
    };
  }
}
