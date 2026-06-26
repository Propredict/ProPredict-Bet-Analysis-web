import { getIsAndroidApp } from "@/hooks/usePlatform";
import bannerAsset from "@/assets/1xbet-banner.gif.asset.json";

const DEFAULT_AFFILIATE_URL = "https://propredict.s.gy/1xbet-register";

interface AffiliateBanner1xBetProps {
  href?: string;
}

/**
 * 1xBet affiliate banner – WEB ONLY.
 * Hidden entirely on Android WebView per compliance.
 */
export function AffiliateBanner1xBet({ href = DEFAULT_AFFILIATE_URL }: AffiliateBanner1xBetProps = {}) {
  const isAndroid = getIsAndroidApp();
  if (isAndroid) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label="1xBet – Register now (sponsored)"
      className="group block relative overflow-hidden rounded-xl border border-white/10 shadow-lg hover:shadow-xl hover:border-blue-400/40 transition-all"
    >
      <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white/70">
        Sponsored
      </span>
      <img
        src={bannerAsset.url}
        alt="1xBet – Register now"
        className="block w-full h-auto"
        loading="lazy"
      />
      <span className="absolute bottom-1 right-2 z-20 text-[9px] text-white/70">
        18+ • Play responsibly
      </span>
    </a>
  );
}