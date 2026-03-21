import { useEffect, useRef, useState } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

type AdSlotProps = {
  slot?: string;
  style?: React.CSSProperties;
  className?: string;
};

export default function AdSlot({
  slot = "4037677571",
  style,
  className,
}: AdSlotProps) {
  const isAndroid = getIsAndroidApp();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    if (isAndroid) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("Adsense error", e);
    }
  }, [isAndroid]);

  // Observe if the ad actually renders content
  useEffect(() => {
    if (isAndroid || !wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHasAd(entry.contentRect.height > 0);
      }
    });
    const ins = wrapperRef.current.querySelector("ins");
    if (ins) observer.observe(ins);
    return () => observer.disconnect();
  }, [isAndroid]);

  // Hide AdSense on Android — native AdMob handles ads there
  if (isAndroid) return null;

  return (
    <div
      ref={wrapperRef}
      className={`adslot-wrapper ${className || ""}`}
      style={{
        margin: hasAd ? "24px 0" : 0,
        textAlign: "center",
        overflow: "hidden",
        minHeight: 0,
        maxHeight: hasAd ? "none" : 0,
        transition: "margin 0.2s",
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4138787612808412"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
