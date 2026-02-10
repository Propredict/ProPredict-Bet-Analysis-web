import { useEffect } from "react";

type AdSlotProps = {
  slot?: string;
  style?: React.CSSProperties;
};

export default function AdSlot({
  slot = "4037677571",
  style,
}: AdSlotProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("Adsense error", e);
    }
  }, []);

  return (
    <div
      style={{
        margin: "24px 0",
        textAlign: "center",
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
