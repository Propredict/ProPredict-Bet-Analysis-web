import { useEffect } from "react";
import { usePlatform } from "@/hooks/usePlatform";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4138787612808412";

function hasAdSenseScript(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
}

/**
 * Loads AdSense script ONLY on web.
 * Android WebView wrapper must not load AdSense (policy).
 */
export function AdSenseScript() {
  const { isAndroidApp } = usePlatform();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAndroidApp) return;
    if (hasAdSenseScript()) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = ADSENSE_SRC;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      window.dispatchEvent(new Event("adsense:loaded"));
    });
    document.head.appendChild(script);
  }, [isAndroidApp]);

  return null;
}
