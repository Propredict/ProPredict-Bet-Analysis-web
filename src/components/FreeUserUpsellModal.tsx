import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Lock, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPlan } from "@/hooks/useUserPlan";
import { canShowPopup, markPopupShown, msUntilNextPopup } from "@/lib/popupCooldown";

const SESSION_KEY = "propredict:upsell_shown_session";
const LAST_SHOWN_KEY = "propredict:upsell_last_shown_date";

export function FreeUserUpsellModal() {
  const { plan, isLoading } = useUserPlan();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (plan !== "free") return;

    try {
      // Max once per session
      if (sessionStorage.getItem(SESSION_KEY)) return;
      // Max once per 24h
      const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
      if (lastShown === new Date().toDateString()) return;
    } catch {}

    // Delay so it doesn't collide with the "Choose Your Picks" popup.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        if (!canShowPopup(45_000)) {
          schedule(Math.max(5_000, msUntilNextPopup(45_000) + 1_000));
          return;
        }
        setIsOpen(true);
        markPopupShown();
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
          localStorage.setItem(LAST_SHOWN_KEY, new Date().toDateString());
        } catch {}
      }, delay);
    };
    schedule(15_000 + Math.random() * 2_000);
    return () => clearTimeout(timer);
  }, [plan, isLoading]);

  // Also trigger on 30% scroll
  useEffect(() => {
    if (isLoading || plan !== "free" || isOpen) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
      if (lastShown === new Date().toDateString()) return;
    } catch { return; }

    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPercent >= 0.3) {
        if (!canShowPopup(45_000)) return;
        setIsOpen(true);
        markPopupShown();
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
          localStorage.setItem(LAST_SHOWN_KEY, new Date().toDateString());
        } catch {}
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [plan, isLoading, isOpen]);

  const handleClose = () => setIsOpen(false);

  const handleGetTicket = () => {
    setIsOpen(false);
    if (isAndroidApp && window.Android?.purchaseDailyTicket) {
      window.Android.purchaseDailyTicket();
      return;
    }
    if (isAndroidApp) {
      navigate("/pro-predictions");
      return;
    }
    void startSureOddsWebCheckout();
  };

  if (isLoading || plan !== "free") return null;

  // Random social proof number 60-99
  const socialCount = 60 + Math.floor(Math.random() * 40);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-[360px] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden"
        style={{
          border: '1px solid rgba(245,158,11,0.55)',
          boxShadow: '0 0 40px rgba(245,158,11,0.25), 0 25px 50px -12px rgba(0,0,0,0.6)',
          background: 'radial-gradient(120% 80% at 50% 0%, #241a06 0%, #0d0b06 55%, #050505 100%)',
        }}
      >
        {/* Limited ribbon */}
        <div
          className="absolute right-0 top-0 px-2.5 py-1.5 text-[9px] font-extrabold uppercase leading-tight text-black text-center rounded-bl-lg z-10"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
        >
          Limited<br />picks<br />today!
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute left-3 top-3 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5 text-amber-200/70" />
        </button>

        <div className="p-5 pt-7 flex flex-col items-center text-center gap-3.5">
          {/* Ticket badge */}
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center border-2 border-amber-400"
            style={{ boxShadow: '0 0 25px rgba(251,191,36,0.45) inset, 0 0 20px rgba(251,191,36,0.35)' }}
          >
            <Ticket className="h-7 w-7 text-amber-400" />
          </div>

          <DialogTitle className="text-2xl font-black leading-none tracking-tight">
            <span className="text-foreground">SURE ODDS </span>
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(180deg,#fde68a,#f59e0b)' }}
            >
              2+
            </span>
            <span
              className="block text-xl font-black bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(180deg,#fde68a,#f59e0b)' }}
            >
              DAILY TICKET
            </span>
          </DialogTitle>

          <p className="text-xs text-muted-foreground italic">
            High-confidence picks • Odds <span className="text-emerald-400 font-semibold not-italic">&gt; 2.00</span>
          </p>

          {/* Feature grid */}
          <div className="w-full grid grid-cols-4 gap-px rounded-xl border border-amber-500/25 bg-black/40 overflow-hidden">
            {[
              { icon: "🎯", top: "HIGH ODDS", bottom: "> 2.00", accent: true },
              { icon: "🛡️", top: "CAREFULLY", bottom: "SELECTED" },
              { icon: "📊", top: "FULL MATCH", bottom: "ANALYSIS" },
              { icon: "🔥", top: "HOT PICKS", bottom: "DAILY" },
            ].map((f) => (
              <div key={f.top} className="flex flex-col items-center gap-1 py-2.5 px-1">
                <span className="text-base leading-none">{f.icon}</span>
                <span className="text-[8px] font-bold text-foreground/85 leading-tight">{f.top}</span>
                <span className={`text-[8px] font-bold leading-tight ${f.accent ? "text-emerald-400" : "text-foreground/85"}`}>
                  {f.bottom}
                </span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="w-full rounded-xl border border-amber-500/40 bg-black/40 px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 text-left">
              <p className="text-[11px] font-bold text-foreground">
                🔥 <span className="text-amber-400">{socialCount} users</span> unlocked this
              </p>
              <p className="text-[10px] text-muted-foreground">Join winners. Get your edge today.</p>
            </div>
            <div
              className="h-12 w-12 shrink-0 rounded-full border-2 border-emerald-400 flex flex-col items-center justify-center"
              style={{ boxShadow: '0 0 15px rgba(52,211,153,0.35)' }}
            >
              <span className="text-xs font-black text-amber-300 leading-none">85%</span>
              <span className="text-[7px] font-bold text-amber-200/70 leading-none mt-0.5">ACCURACY</span>
            </div>
          </div>

          {/* Price */}
          <div className="w-full rounded-xl border border-amber-500/25 bg-black/40 p-3 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground line-through decoration-red-500">€7.99</span>
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl font-black bg-clip-text text-transparent leading-none"
                  style={{ backgroundImage: 'linear-gradient(180deg,#fde68a,#f59e0b)' }}
                >
                  {SURE_ODDS_PRICE_LABEL}
                </span>
                <span className="text-[9px] font-semibold text-muted-foreground tracking-wide">ONE-TIME ACCESS</span>
              </div>
              <div className="h-11 w-11 rounded-full border border-amber-400/70 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black text-amber-300 leading-none">SAVE</span>
                <span className="text-[10px] font-black text-amber-300 leading-none">50%</span>
              </div>
            </div>

            <Button
              onClick={handleGetTicket}
              className="w-full h-12 text-base font-black italic tracking-tight rounded-xl text-black hover:opacity-95"
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #facc15 55%, #4ade80)',
                boxShadow: '0 0 25px rgba(245,158,11,0.35)',
              }}
            >
              GET TODAY'S TICKET 🚀
            </Button>

            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              INSTANT ACCESS AFTER PAYMENT
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors pb-1"
          >
            Continue Free
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

