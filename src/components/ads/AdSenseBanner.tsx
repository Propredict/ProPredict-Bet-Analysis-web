import { useEffect, useRef } from "react";

interface AdSenseBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

/**
 * Google AdSense responsive banner component.
 * This is a placeholder that will display ads once AdSense is configured.
 * 
 * To activate:
 * 1. Add your AdSense script to index.html
 * 2. Replace slot IDs with your actual ad unit IDs
 */
export function AdSenseBanner({ slot, format = "auto", className = "" }: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdSenseLoaded = typeof window !== "undefined" && (window as any).adsbygoogle;

  useEffect(() => {
    // Only push ads if AdSense script is loaded
    if (isAdSenseLoaded && adRef.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.log("AdSense not available");
      }
    }
  }, [isAdSenseLoaded]);

  // Placeholder styling for when AdSense is not loaded yet
  if (!isAdSenseLoaded) {
    return (
      <div 
        className={`w-full flex items-center justify-center bg-muted/30 border border-border/50 rounded-lg overflow-hidden ${className}`}
        style={{ minHeight: format === "horizontal" ? "90px" : "250px" }}
      >
        <span className="text-[10px] text-muted-foreground/50">Advertisement</span>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXX" // Replace with your AdSense publisher ID
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
 */
export function InContentAd({ className = "" }: { className?: string }) {
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
 */
export function FooterAd({ className = "" }: { className?: string }) {
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
