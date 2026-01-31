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
  return (window as any).__IS_ANDROID_APP__ === true;
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
