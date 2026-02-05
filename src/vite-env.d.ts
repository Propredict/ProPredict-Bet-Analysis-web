/// <reference types="vite/client" />

// Android WebView bridge interface
interface AndroidBridge {
  // Rewarded Ads
  watchRewardedAd?: () => void;
  showRewardedAd?: () => void;
  
  // Interstitial Ads
  showInterstitial?: () => void;
  
  // RevenueCat Subscriptions (uses Purchases.getOfferings() + purchasePackage)
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
