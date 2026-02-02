import { useEffect, useState } from "react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";

interface EzoicAdProps {
  placeholderId: number;
  className?: string;
}

/**
 * Ezoic ad placeholder component.
 * Renders an Ezoic placeholder div that will be filled by Ezoic's ad system.
 * 
 * IMPORTANT: Ads are ONLY shown on web (desktop + mobile browser).
 * Android WebView users do not see any ads (AdMob is used natively).
 */
export function EzoicAd({ placeholderId, className = "" }: EzoicAdProps) {
  const { isAndroidApp } = usePlatform();
  const [ezoicReady, setEzoicReady] = useState<boolean>(
    typeof window !== "undefined" && !!window.ezstandalone
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ezoicReady) return;

    const onLoaded = () => setEzoicReady(true);
    window.addEventListener("ezoic:loaded", onLoaded);
    return () => window.removeEventListener("ezoic:loaded", onLoaded);
  }, [ezoicReady]);

  useEffect(() => {
    // Trigger Ezoic to show ads for this placeholder
    if (ezoicReady && !isAndroidApp && window.ezstandalone?.cmd) {
      window.ezstandalone.cmd.push(() => {
        window.ezstandalone?.showAds([placeholderId]);
      });
    }
  }, [ezoicReady, isAndroidApp, placeholderId]);

  // Hide all ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  // Don't render placeholder if Ezoic is not loaded
  if (!ezoicReady) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div id={`ezoic-pub-ad-placeholder-${placeholderId}`} />
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
      <EzoicAd 
        placeholderId={101}
        className="rounded-lg"
      />
    </div>
  );
}

/**
 * Footer banner ad for placement at the bottom of pages.
 * 
 * VISIBLE TO: Free and Pro (basic) web users only.
 * HIDDEN for: Premium users, Admin users, and Android WebView.
 * Footer ads are non-intrusive and shown for revenue.
 */
export function FooterAd({ className = "" }: { className?: string }) {
  const { plan, isAdmin } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  
  // Hide ads on Android WebView - no empty gaps
  if (isAndroidApp) {
    return null;
  }

  // Hide footer ads for Premium and Admin users (completely ad-free experience)
  if (plan === "premium" || isAdmin) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <EzoicAd 
        placeholderId={102}
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
 * - Pro (basic), Premium, and Admin users
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

  // Hide ads completely for Pro, Premium and Admin users (no space reserved)
  if (plan === "basic" || plan === "premium" || isAdmin) {
    return null;
  }

  return (
    <div className={`w-full max-w-md mx-auto my-4 ${className}`}>
      <EzoicAd 
        placeholderId={103}
        className="rounded-lg shadow-sm"
      />
    </div>
  );
}
