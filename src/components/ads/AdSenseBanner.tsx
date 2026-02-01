import { useEffect, useRef, useState } from "react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";

interface AdSenseBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

/**
 * Google AdSense responsive banner component.
 * This is a placeholder that will display ads once AdSense is configured.
 * 
 * IMPORTANT: Ads are ONLY shown on web (desktop + mobile browser).
 * Android WebView users do not see any ads (clean native experience).
 * Pro and Premium subscribers do not see in-content/sidebar ads.
 * 
 * To activate:
 * 1. Add your AdSense script to index.html
 * 2. Replace slot IDs with your actual ad unit IDs
 */
export function AdSenseBanner({ slot, format = "auto", className = "" }: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const { isAndroidApp } = usePlatform();
  const isAdSenseLoaded = typeof window !== "undefined" && (window as any).adsbygoogle;
  const [adSenseReady, setAdSenseReady] = useState<boolean>(!!isAdSenseLoaded);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (adSenseReady) return;

    const onLoaded = () => setAdSenseReady(true);
    window.addEventListener("adsense:loaded", onLoaded);
    return () => window.removeEventListener("adsense:loaded", onLoaded);
  }, [adSenseReady]);

  useEffect(() => {
    // Only push ads if AdSense script is loaded and not on Android
    if (adSenseReady && adRef.current && !isAndroidApp) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.log("AdSense not available");
      }
    }
  }, [adSenseReady, isAndroidApp]);

  // Hide all ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  // Don't render placeholder if AdSense is not loaded
  // This prevents empty space in production before ads are configured
  if (!adSenseReady) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4138787612808412"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

/**
 * In-content ad specifically designed to be placed between card rows.
 * Responsive and styled to match the app design.
 * 
 * AUTOMATICALLY HIDDEN for:
 * - Android WebView users (clean native experience)
 * - Pro, Premium, and Admin users
 */
export function InContentAd({ className = "" }: { className?: string }) {
  const { plan, isAdmin } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  
  // Hide ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  // Hide ads for Pro (basic), Premium, and Admin users
  if (plan === "basic" || plan === "premium" || isAdmin) {
    return null;
  }

  return (
    <div className={`col-span-full my-2 ${className}`}>
      <AdSenseBanner 
        slot="XXXXXXXXXX" // Replace with your in-content ad slot ID
        format="horizontal"
        className="rounded-lg"
      />
    </div>
  );
}

/**
 * Footer banner ad for placement at the bottom of pages.
 * 
 * VISIBLE TO ALL WEB USERS (Free, Pro, Premium, Admin).
 * HIDDEN on Android WebView for clean native experience.
 * Footer ads are non-intrusive and shown globally for revenue.
 */
export function FooterAd({ className = "" }: { className?: string }) {
  const { isAndroidApp } = usePlatform();
  
  // Hide ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <AdSenseBanner 
        slot="XXXXXXXXXX" // Replace with your footer ad slot ID
        format="horizontal"
        className="max-w-[728px] mx-auto"
      />
    </div>
  );
}

/**
 * Sidebar banner ad for placement alongside content.
 * 
 * AUTOMATICALLY HIDDEN for:
 * - Android WebView users (clean native experience)
 * - Premium and Admin users
 * 
 * Use only on Dashboard, Tips, and Tickets pages.
 */
export function SidebarAd({ className = "" }: { className?: string }) {
  const { plan, isAdmin } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  
  // Hide ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  // Hide ads completely for Premium and Admin users (no space reserved)
  if (plan === "premium" || isAdmin) {
    return null;
  }

  return (
    <div className={`w-full max-w-md mx-auto my-4 ${className}`}>
      <AdSenseBanner 
        slot="XXXXXXXXXX" // Replace with your sidebar ad slot ID
        format="horizontal"
        className="rounded-lg shadow-sm"
      />
    </div>
  );
}
