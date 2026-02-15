import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan, type ContentTier, type ContentType, type UnlockMethod } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { setPendingAdUnlock, clearPendingAdUnlock, getPendingAdUnlock } from "@/hooks/pendingAdUnlock";

interface UseUnlockHandlerOptions {
  onUpgradeBasic?: () => void;
  onUpgradePremium?: () => void;
}

export function useUnlockHandler(options: UseUnlockHandlerOptions = {}) {
  const navigate = useNavigate();
  const { getUnlockMethod } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Listen for ad result messages and clear loading state.
  // Also enforce a safety timeout so the spinner never gets stuck forever.
  useEffect(() => {
    if (!isAndroidApp) return;

    const handleMessage = (event: MessageEvent) => {
      console.log("[UnlockHandler] postMessage received:", typeof event.data, JSON.stringify(event.data));
      const data = typeof event.data === "string" ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })() : event.data;
      const { type } = data || {};

      if (type === "AD_UNLOCK_SUCCESS") {
        // Global handler in UserPlanProvider does the actual unlock.
        // We just clear the local loading state here.
        setUnlockingId(null);
      }

      if (
        type === "AD_UNLOCK_CANCELLED" ||
        type === "RESET_AD_BUTTON" ||
        type === "AD_LOAD_FAILED"
      ) {
        clearPendingAdUnlock();
        setUnlockingId(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isAndroidApp]);

  // Safety timeout: reset spinner after 30s if no response from native layer
  useEffect(() => {
    if (!unlockingId) return;

    const timeout = setTimeout(() => {
      clearPendingAdUnlock();
      setUnlockingId(null);
    }, 30_000);

    return () => clearTimeout(timeout);
  }, [unlockingId]);

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

        console.log("[UnlockHandler] 🎯 Setting pending ad-unlock:", contentType, contentId);
        setUnlockingId(contentId);
        setPendingAdUnlock({ contentType, contentId });
        console.log("[UnlockHandler] 🎯 Pending after set:", JSON.stringify(getPendingAdUnlock()));

        // Direct JS bridge call - window.Android.watchRewardedAd()
        const android = (window as any).Android;
        if (android && typeof android.watchRewardedAd === "function") {
          console.log("[UnlockHandler] 📺 Calling Android.watchRewardedAd()");
          android.watchRewardedAd();
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
// Android bridge types are declared centrally in src/vite-env.d.ts
