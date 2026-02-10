import { useEffect, useRef } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

interface WebAdBannerProps {
  slot?: string;
  format?: string;
  fullWidthResponsive?: boolean;
  className?: string;
}

/**
 * Responsive Google AdSense display ad – WEB ONLY.
 * Hidden entirely on Android WebView.
 */
export function WebAdBanner({
  slot = "auto",
  format = "auto",
  fullWidthResponsive = true,
  className = "",
}: WebAdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (isAndroid || pushed.current) return;
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, [isAndroid]);

  if (isAndroid) return null;

  return (
    <div className={`web-ad-banner overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4138787612808412"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        ref={adRef}
      />
    </div>
  );
}
