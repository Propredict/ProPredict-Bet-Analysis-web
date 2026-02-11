import { getIsAndroidApp } from "@/hooks/usePlatform";

/**
 * Initialize OneSignal Web Push SDK.
 * Only runs on the web version (not inside Android WebView).
 */
export function initOneSignalWeb() {
  // Skip in Android app — it uses its own native OneSignal SDK
  if (getIsAndroidApp()) return;

  // Don't initialize twice
  if ((window as any).__oneSignalWebInitialized) return;
  (window as any).__oneSignalWebInitialized = true;

  const w = window as any;
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(async function (OneSignal: any) {
    await OneSignal.init({
      appId: "31fc0b24-9d06-42ae-8eae-d224f781a97a",
      notifyButton: {
        enable: true,
        size: "small",
        position: "bottom-right",
      },
      welcomeNotification: {
        title: "ProPredict",
        message: "You'll now receive alerts for new tips & tickets!",
      },
    });
  });

  // Load the OneSignal SDK script
  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  document.head.appendChild(script);
}
