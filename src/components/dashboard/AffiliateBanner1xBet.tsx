import { TrendingUp, Shield, Zap, ArrowRight, Lock } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const DEFAULT_AFFILIATE_URL =
  "https://reffpa.com/L?tag=d_5489744m_1599c_dashboard&site=5489744&ad=1599&r=sports";

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
      aria-label="1xBet – Get the Best Odds Today (sponsored)"
      className="group block relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#0a1628] via-[#0d1f3a] to-[#0a1628] shadow-lg hover:shadow-xl hover:border-blue-400/40 transition-all"
    >
      {/* Sponsored tag */}
      <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white/70">
        Sponsored
      </span>

      {/* Glow accent */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-500/20 via-blue-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4">
        {/* Left: Brand + headline */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
          {/* 1xBET logo block */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-md bg-white/5 border border-white/10">
            <span className="text-base sm:text-xl font-black tracking-tight leading-none">
              <span className="text-white">1</span>
              <span className="text-blue-400">X</span>
              <span className="text-white">BET</span>
            </span>
            <span className="text-[7px] sm:text-[8px] font-semibold tracking-[0.15em] text-white/50 mt-0.5">
              BETTING COMPANY
            </span>
          </div>

          {/* Headline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/20 text-blue-300 text-[9px] font-bold uppercase tracking-wider">
                Official Partner
              </span>
            </div>
            <h3 className="text-sm sm:text-lg font-extrabold text-white leading-tight truncate">
              Get the <span className="text-blue-400">Best Odds</span> Today
            </h3>
            <p className="hidden sm:block text-[11px] text-white/60 mt-0.5">
              AI insights + best available odds across thousands of events
            </p>
          </div>
        </div>

        {/* Middle: Feature pills (desktop only) */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-white/70">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold">Best Odds</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold">Trusted</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold">Fast Payouts</span>
          </div>
        </div>

        {/* Right: CTA */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wide shadow-md group-hover:shadow-blue-500/40 group-hover:scale-[1.03] transition-all">
            <span>Check Odds</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-white/50">
            <Lock className="w-2.5 h-2.5" />
            <span>18+ • Play responsibly</span>
          </div>
        </div>
      </div>
    </a>
  );
}