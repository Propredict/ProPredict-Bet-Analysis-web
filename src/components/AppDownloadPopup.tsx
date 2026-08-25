import { useEffect, useState } from "react";
import { X, Flame, Smartphone, Zap, Target, Trophy } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const STORAGE_KEY = "app-download-popup-dismissed";

function wasDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  const today = new Date().toDateString();
  return dismissed === today;
}

export function AppDownloadPopup() {
  const [show, setShow] = useState(false);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    // Don't show on Android app or if already dismissed today
    if (isAndroid || wasDismissedToday()) return;

    const timer = setTimeout(() => setShow(true), 60 * 1000); // 60 seconds
    return () => clearTimeout(timer);
  }, [isAndroid]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-gradient-to-b from-card to-background shadow-2xl overflow-hidden animate-scale-in">
        {/* Stadium light accents */}
        <div className="absolute top-0 left-4 w-1 h-16 bg-gradient-to-b from-primary/40 to-transparent rounded-full blur-sm" />
        <div className="absolute top-0 right-4 w-1 h-16 bg-gradient-to-b from-primary/40 to-transparent rounded-full blur-sm" />
        <div className="absolute top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/60 hover:bg-background/80 text-foreground/80 hover:text-foreground transition-colors z-20 border border-border/50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="relative p-6 pt-8 text-center">
          {/* Flame icon */}
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-warning/20 to-destructive/20 border border-warning/30 flex items-center justify-center animate-pulse-glow-star">
            <Flame className="h-7 w-7 text-warning" />
          </div>

          {/* Headline */}
          <h3 className="text-2xl font-black uppercase tracking-tight leading-none text-foreground">
            Don't miss today's
          </h3>
          <h3 className="text-3xl font-black uppercase tracking-tight leading-none mt-1">
            <span className="text-primary">FREE</span>
            <span className="text-foreground"> tips!</span>
          </h3>

          <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            Get instant access on mobile
            <Smartphone className="h-4 w-4 text-primary" />
          </p>

          {/* Features */}
          <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/50 p-3">
            {[
              { icon: Zap, label: "FAST ACCESS", desc: "Anytime" },
              { icon: Target, label: "DAILY TIPS", desc: "Expert picks" },
              { icon: Trophy, label: "MORE WINS", desc: "Better results" },
            ].map((f, i) => (
              <div key={f.label} className="flex-1 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[9px] font-bold text-foreground leading-tight tracking-wide">{f.label}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">{f.desc}</p>
                {i < 2 && <div className="hidden" />}
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="mt-5 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-warning via-warning to-accent text-warning-foreground font-black text-lg uppercase tracking-wide hover:opacity-95 transition-opacity shadow-lg shadow-warning/25 animate-cta-blink"
          >
            <Smartphone className="h-5 w-5" />
            <span>Download App</span>
          </a>

          {/* Skip */}
          <button
            onClick={dismiss}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-muted-foreground/30"
          >
            No thanks, I'll continue browsing
          </button>
        </div>

        {/* Bottom glow accent */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full blur-sm" />
      </div>
    </div>
  );
}
