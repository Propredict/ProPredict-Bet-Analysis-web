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

  // Show ad slot only when AdSense reports a filled ad
  useEffect(() => {
    if (isAndroid || !wrapperRef.current) return;

    const ins = wrapperRef.current.querySelector("ins.adsbygoogle") as HTMLElement | null;
    if (!ins) return;

    const updateHasAd = () => {
      const adStatus = ins.getAttribute("data-ad-status");
      if (adStatus === "filled") {
        setHasAd(true);
        return;
      }
      if (adStatus === "unfilled") {
        setHasAd(false);
        return;
      }

      const iframe = ins.querySelector("iframe");
      setHasAd(Boolean(iframe) && ins.getBoundingClientRect().height > 20);
    };

    updateHasAd();

    const attrObserver = new MutationObserver(updateHasAd);
    attrObserver.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    const childObserver = new MutationObserver(updateHasAd);
    childObserver.observe(ins, { childList: true, subtree: true });

    return () => {
      attrObserver.disconnect();
      childObserver.disconnect();
    };
  }, [isAndroid]);

  // Hide AdSense on Android — native AdMob handles ads there
  if (isAndroid) return null;

  return (
    <div
      ref={wrapperRef}
      className={`adslot-wrapper ${className || ""}`}
      style={{
        display: hasAd ? "block" : "none",
        margin: hasAd ? "24px 0" : 0,
        textAlign: "center",
        overflow: "hidden",
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
