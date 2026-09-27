import { useEffect, useState } from "react";
import { X, Crown, Smartphone, Zap, Target, Trophy, ArrowRight } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import popupHero from "@/assets/app-download-popup-hero.jpg";

const STORAGE_KEY = "app-download-popup-dismissed";

function wasDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  const today = new Date().toDateString();
  return dismissed === today;
}

const FEATURES = [
  { icon: Zap, label: "FAST ACCESS", en: "Anytime", sr: "U svakom trenutku" },
  { icon: Target, label: "DAILY TIPS", en: "Expert picks", sr: "Ekspert izbori" },
  { icon: Trophy, label: "MORE WINS", en: "Better results", sr: "Bolji rezultati" },
];

export function AppDownloadPopup({ force = false }: { force?: boolean } = {}) {
  const [show, setShow] = useState(false);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    // Don't show on Android app or if already dismissed today
    if (force) { setShow(true); return; }
    if (isAndroid || wasDismissedToday()) return;

    const timer = setTimeout(() => {
      // Re-check at fire time: Android flag can arrive after mount
      if (getIsAndroidApp() || wasDismissedToday()) return;
      setShow(true);
    }, 60 * 1000); // 60 seconds
    return () => clearTimeout(timer);
  }, [isAndroid]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))]">
      <div className="relative w-full max-w-md max-h-full overflow-y-auto overscroll-contain rounded-3xl bg-gradient-to-b from-[#0a2148] via-[#071a38] to-[#050f24] shadow-[0_25px_80px_-15px_rgba(2,10,30,0.9)] ring-1 ring-primary/40 animate-scale-in">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ===== Hero image with logo overlay ===== */}
        <div className="relative">
          <img
            src={popupHero}
            alt="ProPredict app on mobile"
            width={1024}
            height={880}
            className="w-full h-56 sm:h-64 object-cover object-center"
          />
          {/* Fade into card background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#04122c]/40 via-transparent to-[#071a38]" />

          {/* Logo block */}
          <div className="absolute top-4 right-5 flex flex-col items-end drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-1">
              <Crown className="h-5 w-5 text-warning fill-warning/30" />
              <span className="text-2xl font-black tracking-tight">
                <span className="text-white">Pro</span>
                <span className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">Predict</span>
              </span>
            </div>
            <p className="text-[8px] font-semibold tracking-[0.28em] text-white/80 uppercase mt-0.5">
              AI Predictions &amp; Analysis
            </p>
          </div>
        </div>

        {/* ===== Headline ===== */}
        <div className="relative -mt-6 px-6 text-center">
          <h3 className="text-[26px] font-black uppercase leading-[1.05] tracking-tight text-white drop-shadow-lg">
            Don't miss
            <br />
            <span className="inline-flex items-center gap-1.5">
              today's
              <Crown className="h-5 w-5 text-warning fill-warning/40 -mt-2" />
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-cyan-300 to-primary bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(56,189,248,0.45)]">
              Free tips
            </span>
          </h3>
          <p className="mt-2 text-base font-extrabold uppercase leading-tight text-white/95">
            Ne propustajte današnje
            <br />
            <span className="text-primary font-black">Free tipove</span>
          </p>

          <p className="mt-3 text-sm text-white/80">
            Get instant access on mobile
            <br />
            <span className="text-white/60">/ Odmah pristupi na telefonu</span>
          </p>
        </div>

        {/* ===== Features strip ===== */}
        <div className="mt-5 mx-4 rounded-2xl bg-white shadow-xl p-4">
          <div className="flex items-stretch">
            {FEATURES.map((f, i) => (
              <div key={f.label} className="flex-1 flex flex-col items-center text-center relative">
                {i > 0 && <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200" />}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-[#1565d8] flex items-center justify-center shadow-md shadow-primary/30 mb-2">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-extrabold text-[#0a2148] leading-tight tracking-wide">{f.label}</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{f.en}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{f.sr}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CTA ===== */}
        <div className="px-4 mt-4">
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-warning via-[#ffc531] to-warning text-[#2b1a00] font-black text-lg uppercase tracking-wide hover:opacity-95 transition-opacity shadow-[0_10px_30px_-8px_rgba(245,158,11,0.6)] ring-2 ring-warning/50 animate-cta-blink"
          >
            <Smartphone className="h-5 w-5" />
            <span>Download app / Preuzmi app</span>
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        {/* ===== Skip ===== */}
        <div className="px-6 pb-5 pt-3 text-center">
          <button
            onClick={dismiss}
            className="text-sm text-white/60 hover:text-white transition-colors underline underline-offset-4 decoration-white/30"
          >
            No thanks, I'll continue browsing / Produži na website
          </button>
        </div>
      </div>
    </div>
  );
}
