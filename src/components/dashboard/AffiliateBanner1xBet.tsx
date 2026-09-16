import { getIsAndroidApp } from "@/hooks/usePlatform";
import bannerAsset from "@/assets/1xbet-banner.gif.asset.json";

const DEFAULT_AFFILIATE_URL = "https://propredict.s.gy/1xbet-register";

interface AffiliateBanner1xBetProps {
  href?: string;
  compact?: boolean;
}

/**
 * 1xBet affiliate banner – WEB ONLY.
 * Hidden entirely on Android WebView per compliance.
 */
export function AffiliateBanner1xBet({ href = DEFAULT_AFFILIATE_URL, compact = false }: AffiliateBanner1xBetProps = {}) {
  const isAndroid = getIsAndroidApp();
  if (isAndroid) return null;

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="1xBet – Register now (sponsored)"
        className="group relative flex aspect-square w-full max-w-[150px] flex-col items-center justify-center justify-self-center overflow-hidden rounded-xl border-2 border-primary/25 bg-card shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-1 hover:border-primary active:scale-95 motion-reduce:transform-none"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Sponsored
        </span>

        <span className="mt-3 flex w-full items-center justify-center px-4" aria-hidden="true">
          <span className="skew-x-[-6deg] rounded bg-primary px-2 py-1 text-lg font-black uppercase leading-none text-primary-foreground sm:text-xl">1x</span>
          <span className="ml-1 text-xl font-black uppercase leading-none text-sidebar sm:text-2xl">Bet</span>
        </span>

        <span className="absolute bottom-4 rounded-full border border-primary/35 bg-background px-3 py-1 text-[9px] font-black uppercase text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          Join now
        </span>
        <span className="sr-only">18+ • Play responsibly</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label="1xBet – Register now (sponsored)"
      className="group relative mx-auto block w-full max-w-3xl overflow-hidden rounded-xl border-2 border-primary/35 bg-sidebar shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-xl hover:shadow-primary/25"
    >
      <span className="absolute top-2 right-2 z-20 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
        Sponsored
      </span>
      <img
        src={bannerAsset.url}
        alt="1xBet – Register now"
        className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
        loading="lazy"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/55 to-transparent" />
      <span className="absolute bottom-1.5 right-2 z-20 text-[9px] font-semibold text-white/80">
        18+ • Play responsibly
      </span>
    </a>
  );
}