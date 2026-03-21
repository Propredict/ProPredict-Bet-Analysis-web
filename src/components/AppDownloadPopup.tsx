import { useEffect, useState } from "react";
import { Smartphone, X, Star } from "lucide-react";
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

    const timer = setTimeout(() => setShow(true), 5 * 60 * 1000); // 5 minutes
    return () => clearTimeout(timer);
  }, [isAndroid]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/50" />

        <div className="p-6 text-center space-y-4">
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Get ProPredict App</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Faster predictions, real-time alerts & offline access — completely free!
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 text-warning fill-warning" />
            ))}
            <span className="text-xs text-muted-foreground ml-1">4.9 on Google Play</span>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { emoji: "⚡", label: "Faster" },
              { emoji: "🔔", label: "Alerts" },
              { emoji: "📊", label: "Live Stats" },
            ].map((f) => (
              <div key={f.label} className="py-2 px-1 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-lg">{f.emoji}</span>
                <p className="text-[9px] text-muted-foreground mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            ⬇ Download Free App
          </a>

          {/* Skip */}
          <button
            onClick={dismiss}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            No thanks, I'll stay on the website
          </button>
        </div>
      </div>
    </div>
  );
}
