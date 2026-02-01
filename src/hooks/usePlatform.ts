/**
 * Platform detection hook for Web vs Mobile App
 * 
 * Currently always returns false (web mode).
 * When building the mobile app with Capacitor, this will be updated
 * to detect the native platform.
 * 
 * Future integration:
 * - Install @capacitor/core
 * - Use Capacitor.isNativePlatform() for detection
 */

/**
 * Check if running inside Android WebView app
 */
function detectAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Persist Android mode across SPA navigations.
  // In WebView the initial entry URL includes ?platform=android, but internal
  // client-side navigation can drop the query param (e.g. /ai-predictions).
  // We store a session flag once detected to avoid AdSense/Stripe web flows.
  const STORAGE_KEY = 'propredict:platform';

  try {
    if (window.sessionStorage?.getItem(STORAGE_KEY) === 'android') return true;
  } catch {
    // ignore
  }

  // Query param support for Android WebView wrapper: ?platform=android
  try {
    const platform = new URLSearchParams(window.location.search).get('platform');
    if (platform?.toLowerCase() === 'android') {
      try {
        window.sessionStorage?.setItem(STORAGE_KEY, 'android');
      } catch {
        // ignore
      }
      return true;
    }
  } catch {
    // ignore
  }

  // Explicit global flag support (optional)
  if ((window as any).isAndroidApp === true) {
    try {
      window.sessionStorage?.setItem(STORAGE_KEY, 'android');
    } catch {
      // ignore
    }
    return true;
  }

  // Check for Android bridge object OR legacy flag
  const hasBridge = typeof (window as any).Android !== 'undefined';
  const hasLegacyFlag = (window as any).__IS_ANDROID_APP__ === true;
  if (hasBridge || hasLegacyFlag) {
    try {
      window.sessionStorage?.setItem(STORAGE_KEY, 'android');
    } catch {
      // ignore
    }
    return true;
  }

  return false;
}

export function usePlatform() {
  const isAndroidApp = detectAndroidApp();
  
  return {
    isMobileApp: isAndroidApp,
    isAndroidApp,
    isWeb: !isAndroidApp,
  };
}

/**
 * Standalone function for non-hook contexts
 */
export function getIsMobileApp(): boolean {
  return detectAndroidApp();
}

export function getIsAndroidApp(): boolean {
  return detectAndroidApp();
}
