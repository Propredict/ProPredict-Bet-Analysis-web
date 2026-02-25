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
 * 3. 'REVENUECAT_OFFERINGS' postMessage with current offerings
 */

import { useState, useEffect, useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import type { UserPlan } from "@/hooks/useUserPlan";

interface RevenueCatEntitlements {
  pro: boolean;
  premium: boolean;
}

/** Shape of a single RevenueCat package from native */
interface RevenueCatPackage {
  identifier: string;
  productId: string;
  // Add more fields as needed (price, title, etc.)
}

/** Offerings data posted from native side */
interface RevenueCatOfferings {
  current?: {
    identifier: string;
    availablePackages: RevenueCatPackage[];
  };
}

interface UseRevenueCatResult {
  plan: UserPlan;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  offerings: RevenueCatOfferings | null;
  offeringsReady: boolean;
  refetch: () => void;
}

// Android bridge type for RevenueCat calls
interface AndroidBridgeRC {
  showRewardedAd?: () => void;
  requestEntitlements?: () => void;
  requestOfferings?: () => void;
  purchasePackage?: (packageId: string) => void;
  purchasePlan?: (planId: string) => void;
  restorePurchases?: () => void;
  getPro?: () => void;
  getPremium?: () => void;
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
  return (window as any).__REVENUECAT_ENTITLEMENTS__;
}

export function useRevenueCat(): UseRevenueCatResult {
  const isAndroidApp = getIsAndroidApp();
  
  const [entitlements, setEntitlements] = useState<RevenueCatEntitlements | undefined>(
    isAndroidApp ? readEntitlements() : undefined
  );
  const [isLoading, setIsLoading] = useState(isAndroidApp);
  const [offerings, setOfferings] = useState<RevenueCatOfferings | null>(null);
  const [offeringsReady, setOfferingsReady] = useState(false);

  // Request entitlements AND offerings from Android on mount
  useEffect(() => {
    if (!isAndroidApp) {
      setIsLoading(false);
      return;
    }

    const android = (window as any).Android as AndroidBridgeRC | undefined;

    // Read initial entitlements
    const initial = readEntitlements();
    if (initial) {
      setEntitlements(initial);
      setIsLoading(false);
    } else {
      // Request entitlements from Android if not already set
      if (android?.requestEntitlements) {
        android.requestEntitlements();
      }
      
      // Set a timeout to stop loading even if Android doesn't respond
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }

    // Request offerings so we have dynamic product data
    if (android?.requestOfferings) {
      console.log("[RevenueCat] Requesting offerings from native");
      android.requestOfferings();
    }
  }, [isAndroidApp]);

  // Listen for entitlement updates AND offerings from Android
  useEffect(() => {
    if (!isAndroidApp) return;

    const handleEntitlementsUpdate = (event: CustomEvent<RevenueCatEntitlements>) => {
      setEntitlements(event.detail);
      setIsLoading(false);
    };

    // Listen for window object changes via message
    const handleMessage = (event: MessageEvent) => {
      const { type, entitlements: newEntitlements, offerings: newOfferings } = event.data || {};
      
      if (type === "REVENUECAT_ENTITLEMENTS_UPDATE" && newEntitlements) {
        setEntitlements(newEntitlements);
        setIsLoading(false);
      }

      // Native posts offerings data after requestOfferings() or on app start
      if (type === "REVENUECAT_OFFERINGS" && newOfferings) {
        console.log("[RevenueCat] Received offerings from native:", newOfferings);
        setOfferings(newOfferings);
        setOfferingsReady(true);
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
    const android = (window as any).Android as AndroidBridgeRC | undefined;
    if (isAndroidApp && android?.requestEntitlements) {
      setIsLoading(true);
      android.requestEntitlements();
    }
    // Also refresh offerings
    if (isAndroidApp && android?.requestOfferings) {
      android.requestOfferings();
    }
  }, [isAndroidApp]);

  const plan = getPlanFromEntitlements(entitlements);
  const hasActiveSubscription = plan !== "free";

  return {
    plan,
    isLoading,
    hasActiveSubscription,
    offerings,
    offeringsReady,
    refetch,
  };
}

/**
 * Purchase a subscription plan via the Android native bridge.
 * 
 * Uses a priority chain:
 * 1. purchasePlan(planKey) — native handles offering lookup dynamically
 * 2. purchasePackage(packageId) — legacy hardcoded IDs
 * 3. getPro()/getPremium() — oldest fallback
 * 
 * planKey format: "pro_monthly", "pro_annual", "premium_monthly", "premium_annual"
 */
export function purchaseSubscription(planId: "basic" | "premium", period: "monthly" | "annual"): void {
  const android = (window as any).Android as AndroidBridgeRC | undefined;
  if (!getIsAndroidApp() || !android) {
    console.warn("[RevenueCat] Android bridge not available");
    return;
  }

  // Build a plan key the native side can map to the correct RevenueCat offering
  const planKey = `${planId === "basic" ? "pro" : "premium"}_${period}`;

  // Priority 1: purchasePlan — native resolves the correct offering dynamically
  if (typeof android.purchasePlan === "function") {
    console.log("[RevenueCat] purchasePlan:", planKey);
    android.purchasePlan(planKey);
    return;
  }

  // Priority 2: purchasePackage with hardcoded IDs (legacy)
  const LEGACY_PACKAGES: Record<string, Record<string, string>> = {
    basic: { monthly: "pro-monthly", annual: "pro-annual" },
    premium: { monthly: "premium-monthly", annual: "premium-annual" },
  };
  const packageId = LEGACY_PACKAGES[planId]?.[period];
  if (packageId && typeof android.purchasePackage === "function") {
    console.log("[RevenueCat] purchasePackage (legacy):", packageId);
    android.purchasePackage(packageId);
    return;
  }

  // Priority 3: getPro/getPremium (oldest fallback)
  if (planId === "basic" && typeof android.getPro === "function") {
    console.log("[RevenueCat] getPro (legacy fallback)");
    android.getPro();
  } else if (planId === "premium" && typeof android.getPremium === "function") {
    console.log("[RevenueCat] getPremium (legacy fallback)");
    android.getPremium();
  } else {
    console.warn("[RevenueCat] No purchase method available on Android bridge");
  }
}

/**
 * Trigger a RevenueCat restore purchases flow on Android.
 */
export function restorePurchases(): void {
  const android = (window as any).Android as AndroidBridgeRC | undefined;
  if (getIsAndroidApp() && android?.restorePurchases) {
    console.log("[RevenueCat] Requesting restore purchases");
    android.restorePurchases();
  } else {
    console.warn("[RevenueCat] restorePurchases not available on Android bridge");
  }
}
