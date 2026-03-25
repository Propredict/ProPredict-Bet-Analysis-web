import { useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const STORAGE_KEY = "exit-intent-popup-dismissed";

function wasDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  return dismissed === new Date().toDateString();
}

export function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (isAndroid || wasDismissedToday()) return;

    let triggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !triggered) {
        triggered = true;
        setShow(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isAndroid]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/10 animate-scale-in">
        <button
          onClick={dismiss}
          className="absolute -top-2 -right-2 p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors z-20 shadow-md"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-t-2xl" />

        <div className="p-6 text-center space-y-4">
          <div className="text-4xl">🔥</div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              Don't miss today's FREE tips!
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get instant access on mobile 📲
            </p>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
          >
            <Smartphone className="h-4 w-4" />
            Download App
          </a>

          <button
            onClick={dismiss}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            No thanks, I'll continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
