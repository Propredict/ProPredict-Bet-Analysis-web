/// <reference types="vite/client" />

// Android WebView bridge interface
interface AndroidBridge {
  // Rewarded Ads
  watchRewardedAd?: () => void;
  showRewardedAd?: () => void;
  
  // Interstitial Ads — context string tells native which placement triggered it
  showInterstitial?: (context: string) => void;
  
  // RevenueCat Subscriptions (SDK 7.x)
  // Native flow: getOfferings() -> find package -> purchase(PurchaseParams.Builder(activity, pkg).build())
  purchasePackage?: (packageId: string) => void;
  requestEntitlements?: () => void;
  
  // Unified purchase method — preferred entry point for Android WebView
  // Calls native RevenueCat purchase flow with the given planId ("basic" | "premium")
  purchasePlan?: (planId: string) => void;
  
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
