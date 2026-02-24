import { useEffect } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

type AdSlotProps = {
  slot?: string;
  style?: React.CSSProperties;
};

export default function AdSlot({
  slot = "4037677571",
  style,
}: AdSlotProps) {
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (isAndroid) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("Adsense error", e);
    }
  }, [isAndroid]);

  // Hide AdSense on Android — native AdMob handles ads there
  if (isAndroid) return null;

  return (
    <div
      className="adslot-wrapper"
      style={{
        margin: "24px 0",
        textAlign: "center",
        overflow: "hidden",
        minHeight: 0,
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
