import { useEffect, useState } from "react";
import { X, Star, Rocket, Zap, Bell, BarChart3, ShieldCheck, ChevronRight, Crown } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-foreground/70 hover:text-foreground transition-colors z-20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero gradient top */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background p-6 pb-5">
          {/* Decorative crown */}
          <div className="absolute top-4 right-10 text-warning/80 animate-pulse-glow-star">
            <Crown className="h-6 w-6" />
          </div>

          <div className="flex items-center gap-4">
            {/* Phone mockup */}
            <div className="relative shrink-0 w-[78px] h-[140px] rounded-[18px] border-[3px] border-foreground/20 bg-background shadow-xl shadow-black/40 overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-foreground/20 rounded-b-full z-10" />
              {/* Screen */}
              <div className="absolute inset-0 flex flex-col p-2 pt-4 bg-gradient-to-b from-card to-background">
                <div className="text-[6px] font-bold text-foreground/90 text-center leading-tight">
                  TODAY'S TICKET
                </div>
                <div className="mt-1 text-[8px] font-bold text-warning text-center">
                  ODDS 2+
                </div>
                <div className="mt-auto space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between text-[5px] text-muted-foreground">
                      <span>Match {i}</span>
                      <span className="text-primary">&gt;2.0</span>
                    </div>
                  ))}
                  <div className="mt-1 rounded px-1 py-1 bg-warning/20 text-[6px] font-bold text-warning text-center">
                    TOTAL 2.35+
                  </div>
                </div>
              </div>
              {/* Reflection */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-md" />
            </div>

            {/* Headline */}
            <div className="text-left">
              <h3 className="text-xl font-bold leading-tight text-foreground">
                Get Premium
              </h3>
              <p className="text-lg font-bold leading-tight text-primary">
                Tips and Tickets
              </p>
              <p className="text-sm font-bold leading-tight text-foreground">
                every day
              </p>
              <p className="text-base font-bold leading-tight text-primary">
                faster on app
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                More value. More wins. Only on the app.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Zap, label: "Faster Access", desc: "Get tips sooner" },
              { icon: Bell, label: "Instant Alerts", desc: "Never miss a pick" },
              { icon: BarChart3, label: "Exclusive Insights", desc: "App-only analysis" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center text-center p-2.5 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-1.5">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[10px] font-bold text-foreground leading-tight">{f.label}</p>
                <p className="text-[8px] text-muted-foreground leading-tight mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 animate-cta-blink"
          >
            <Rocket className="h-4 w-4" />
            <span>Open the App Now</span>
            <ChevronRight className="h-4 w-4" />
          </a>

          {/* Trust badge */}
          <div className="mt-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span>Trusted by thousands of smart players</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 text-warning fill-warning" />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">4.9 on Google Play</span>
            </div>
          </div>

          {/* Skip */}
          <button
            onClick={dismiss}
            className="mt-3 w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
