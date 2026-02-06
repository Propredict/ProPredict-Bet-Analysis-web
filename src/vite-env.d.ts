/// <reference types="vite/client" />

// Android WebView bridge interface
interface AndroidBridge {
  // Rewarded Ads
  watchRewardedAd?: () => void;
  showRewardedAd?: () => void;
  
  // Interstitial Ads
  showInterstitial?: () => void;
  
  // In-app purchases (primary method)
  // planId: "PRO_MONTHLY" | "PRO_ANNUAL" | "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL"
  purchasePlan?: (planId: string) => void;

  // RevenueCat Subscriptions (SDK 7.x) - legacy
  purchasePackage?: (packageId: string) => void;
  requestEntitlements?: () => void;
  
  // Legacy purchase methods (fallback)
  getPro?: () => void;
  buyPro?: () => void;
  getPremium?: () => void;
  buyPremium?: () => void;
}

declare global {
  interface Window {
    Android?: AndroidBridge;
    isAndroidApp?: boolean;
    __IS_ANDROID_APP__?: boolean;
    __REVENUECAT_ENTITLEMENTS__?: {
      pro: boolean;
      premium: boolean;
    };
  }
}
