import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan, type ContentTier, type ContentType, type UnlockMethod } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { setPendingAdUnlock, clearPendingAdUnlock } from "@/hooks/pendingAdUnlock";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Listen for AD_UNLOCK_CANCELLED to clear local loading state.
  // The actual unlock (AD_UNLOCK_SUCCESS) is handled globally in UserPlanProvider.
  useEffect(() => {
    if (!isAndroidApp) return;

    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data || {};

      if (type === "AD_UNLOCK_SUCCESS") {
        // Global handler in UserPlanProvider does the actual unlock.
        // We just clear the local loading state here.
        setUnlockingId(null);
      }

      if (type === "AD_UNLOCK_CANCELLED") {
        clearPendingAdUnlock();
        setUnlockingId(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isAndroidApp]);

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
        setPendingAdUnlock({ contentType, contentId });

        // Direct JS bridge call - window.Android.watchRewardedAd()
        if (window.Android && typeof window.Android.watchRewardedAd === "function") {
          window.Android.watchRewardedAd();
        }

        return false; // Will be unlocked via AD_UNLOCK_SUCCESS message callback
      }

      // Android: Premium only - navigate to paywall (no direct purchase)
      if (method.type === "android_premium_only") {
        // Navigate to Get Premium paywall for both Android and Web
        navigate("/get-premium");
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
   * Navigates to Get Premium paywall
   */
  const handleSecondaryUnlock = useCallback(() => {
    // Navigate to Get Premium paywall for both Android and Web
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
  };
}

// Type declaration for Android WebView interface
declare global {
  interface Window {
    Android?: {
      showInterstitial?: () => void;
      watchRewardedAd?: () => void;
      purchasePlan?: (planId: string) => void;
      buyPro?: () => void;
      buyPremium?: () => void;
      getPro?: () => void;
      getPremium?: () => void;
      requestEntitlements?: () => void;
      purchasePackage?: (packageId: string) => void;
    };
  }
}
