/**
 * RevenueCat integration hook for Android WebView
 * 
 * This hook communicates with the Android native app to get
 * subscription entitlements from RevenueCat.
 * 
 * Entitlement mapping:
 * - "pro" entitlement → plan = "basic"
 * - "premium" entitlement → plan = "premium"
 * - No entitlement → plan = "free"
 * 
 * The Android app injects entitlement data via:
 * 1. window.__REVENUECAT_ENTITLEMENTS__ (initial state)
 * 2. 'revenuecat-entitlements-updated' custom event (updates)
 */

import { useState, useEffect, useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import type { UserPlan } from "@/hooks/useUserPlan";

interface RevenueCatEntitlements {
  pro: boolean;
  premium: boolean;
}

interface UseRevenueCatResult {
  plan: UserPlan;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  refetch: () => void;
}

// Extend Window interface for RevenueCat integration
declare global {
  interface Window {
    __REVENUECAT_ENTITLEMENTS__?: RevenueCatEntitlements;
  }
}

// Android interface type (extends the one in useUnlockHandler.ts)
interface AndroidBridge {
  showRewardedAd?: () => void;
  requestEntitlements?: () => void;
  purchasePackage?: (packageId: string) => void;
}

/**
 * Parse entitlements and determine user plan
 */
function getPlanFromEntitlements(entitlements: RevenueCatEntitlements | undefined): UserPlan {
  if (!entitlements) return "free";
  
  // Premium takes priority over Pro
  if (entitlements.premium) return "premium";
  if (entitlements.pro) return "basic";
  
  return "free";
}

/**
 * Read current entitlements from window object
 */
function readEntitlements(): RevenueCatEntitlements | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__REVENUECAT_ENTITLEMENTS__;
}

export function useRevenueCat(): UseRevenueCatResult {
  const isAndroidApp = getIsAndroidApp();
  
  const [entitlements, setEntitlements] = useState<RevenueCatEntitlements | undefined>(
    isAndroidApp ? readEntitlements() : undefined
  );
  const [isLoading, setIsLoading] = useState(isAndroidApp);

  // Request entitlements from Android on mount
  useEffect(() => {
    if (!isAndroidApp) {
      setIsLoading(false);
      return;
    }

    // Read initial entitlements
    const initial = readEntitlements();
    if (initial) {
      setEntitlements(initial);
      setIsLoading(false);
    } else {
      // Request entitlements from Android if not already set
      const android = window.Android as AndroidBridge | undefined;
      if (android?.requestEntitlements) {
        android.requestEntitlements();
      }
      
      // Set a timeout to stop loading even if Android doesn't respond
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isAndroidApp]);

  // Listen for entitlement updates from Android
  useEffect(() => {
    if (!isAndroidApp) return;

    const handleEntitlementsUpdate = (event: CustomEvent<RevenueCatEntitlements>) => {
      setEntitlements(event.detail);
      setIsLoading(false);
    };

    // Also listen for window object changes via message
    const handleMessage = (event: MessageEvent) => {
      const { type, entitlements: newEntitlements } = event.data || {};
      
      if (type === "REVENUECAT_ENTITLEMENTS_UPDATE" && newEntitlements) {
        setEntitlements(newEntitlements);
        setIsLoading(false);
      }
    };

    window.addEventListener(
      "revenuecat-entitlements-updated",
      handleEntitlementsUpdate as EventListener
    );
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener(
        "revenuecat-entitlements-updated",
        handleEntitlementsUpdate as EventListener
      );
      window.removeEventListener("message", handleMessage);
    };
  }, [isAndroidApp]);

  const refetch = useCallback(() => {
    const android = window.Android as AndroidBridge | undefined;
    if (isAndroidApp && android?.requestEntitlements) {
      setIsLoading(true);
      android.requestEntitlements();
    }
  }, [isAndroidApp]);

  const plan = getPlanFromEntitlements(entitlements);
  const hasActiveSubscription = plan !== "free";

  return {
    plan,
    isLoading,
    hasActiveSubscription,
    refetch,
  };
}

/**
 * Trigger a RevenueCat purchase flow on Android using purchasePackage
 * The Android layer will:
 * 1. Fetch offerings via Purchases.getOfferings()
 * 2. Find the package matching packageId from offerings.current.availablePackages
 * 3. Call Purchases.sharedInstance.purchasePackage(activity, selectedPackage)
 */
export function purchasePackage(packageId: string): void {
  const android = window.Android as AndroidBridge | undefined;
  if (getIsAndroidApp() && android?.purchasePackage) {
    console.log("[RevenueCat] Requesting purchase for package:", packageId);
    android.purchasePackage(packageId);
  } else {
    console.warn("[RevenueCat] purchasePackage not available on Android bridge");
  }
}
