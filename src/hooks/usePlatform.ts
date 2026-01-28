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

export function usePlatform() {
  // TODO: When Capacitor is integrated, replace with:
  // import { Capacitor } from '@capacitor/core';
  // const isMobileApp = Capacitor.isNativePlatform();
  
  const isMobileApp = false; // Always false for web
  
  return {
    isMobileApp,
    isWeb: !isMobileApp,
  };
}

/**
 * Standalone function for non-hook contexts
 */
export function getIsMobileApp(): boolean {
  // TODO: When Capacitor is integrated:
  // import { Capacitor } from '@capacitor/core';
  // return Capacitor.isNativePlatform();
  
  return false; // Always false for web
}
