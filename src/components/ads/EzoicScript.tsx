import { useEffect } from "react";
import { usePlatform } from "@/hooks/usePlatform";

declare global {
  interface Window {
    ezstandalone?: {
      cmd: Array<() => void>;
      showAds: (ids?: number[]) => void;
      define: (...args: number[]) => void;
      enable: () => void;
      display: () => void;
      refresh: () => void;
    };
  }
}

const EZOIC_SRC = "//www.ezojs.com/ezoic/sa.min.js";

function hasEzoicScript(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector('script[src*="ezojs.com"]');
}

/**
 * Loads Ezoic script ONLY on web.
 * Android WebView wrapper must not load Ezoic (AdMob is used instead).
 */
export function EzoicScript() {
  const { isAndroidApp } = usePlatform();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAndroidApp) return;
    if (hasEzoicScript()) return;

    // Initialize ezstandalone
    window.ezstandalone = window.ezstandalone || { cmd: [] } as any;

    const script = document.createElement("script");
    script.async = true;
    script.src = EZOIC_SRC;
    script.addEventListener("load", () => {
      window.dispatchEvent(new Event("ezoic:loaded"));
      
      // Enable Ezoic after script loads
      if (window.ezstandalone?.cmd) {
        window.ezstandalone.cmd.push(() => {
          window.ezstandalone?.enable();
          window.ezstandalone?.display();
        });
      }
    });
    document.head.appendChild(script);
  }, [isAndroidApp]);

  return null;
}
