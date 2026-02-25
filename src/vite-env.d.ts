/// <reference types="vite/client" />

// Android WebView bridge interface
interface AndroidBridge {
  // Rewarded Ads
  watchRewardedAd?: () => void;
  showRewardedAd?: () => void;
  
  // Interstitial Ads — context string tells native which placement triggered it
  showInterstitial?: (context: string) => void;

  // Native Ad toggle — show/hide bottom native ad banner
  toggleNativeAd?: (show: boolean) => void;
  

  // Push permission — request OneSignal notification permission from web layer
  requestPushPermission?: () => void;

  // RevenueCat Offerings — request native to fetch and post back current offerings
  requestOfferings?: () => void;
  
  // RevenueCat Subscriptions (SDK 7.x)
  purchasePackage?: (packageId: string) => void;
  requestEntitlements?: () => void;
  restorePurchases?: () => void;
  
  // Unified purchase method
  purchasePlan?: (planId: string) => void;
  
  // Legacy purchase methods (fallback)
  getPro?: () => void;
  buyPro?: () => void;
  getPremium?: () => void;
  buyPremium?: () => void;
  
  // User sync — sends Supabase UUID to native for RevenueCat login
  syncUser?: (userId: string) => void;

  // Subscription management — opens Google Play subscription management
  manageSubscription?: () => void;

  // Open external URL in system browser
  openExternal?: (url: string) => void;

  // Battery optimization — opens system settings to disable battery optimization
  openBatterySettings?: () => void;

  // OneSignal — get current Player ID from native SDK
  getOneSignalPlayerId?: () => string;
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

export {};
