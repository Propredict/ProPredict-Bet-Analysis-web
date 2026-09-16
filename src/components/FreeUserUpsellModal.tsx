import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Lock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { SURE_ODDS_PRICE_LABEL } from "@/hooks/useDailyTicketUnlock";
import { startSureOddsPurchase } from "@/lib/sureOddsPurchase";
import { trackSureOddsEvent } from "@/lib/sureOddsAnalytics";
import { canShowPopup, markPopupShown, msUntilNextPopup } from "@/lib/popupCooldown";

const SESSION_KEY = "propredict:upsell_shown_session";
const LAST_SHOWN_KEY = "propredict:upsell_last_shown_date";

export function FreeUserUpsellModal() {
  const { plan, isLoading } = useUserPlan();
  const navigate = useNavigate();
  const { isAndroidApp } = usePlatform();
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
    void trackSureOddsEvent("cta_click", "upsell_modal");
    startSureOddsPurchase(undefined, "upsell_modal");
  };


  if (isLoading || plan !== "free") return null;

  // Random social proof number 60-99
  const socialCount = 60 + Math.floor(Math.random() * 40);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-h-[95vh] max-w-[390px] gap-0 overflow-y-auto rounded-xl border-2 border-primary/60 bg-card p-0 shadow-2xl shadow-primary/25 [&>button]:hidden"
      >
        {/* Limited ribbon */}
        <div className="absolute right-0 top-0 z-10 rounded-bl-lg bg-primary px-3 py-2 text-center text-[10px] font-extrabold uppercase leading-tight text-primary-foreground">
          Limited<br />today
        </div>

        {/* Close */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute left-3 top-3 z-10 h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-foreground hover:bg-primary hover:text-primary-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="bg-gradient-to-br from-sidebar via-sidebar-accent to-sidebar px-5 pb-5 pt-8 text-center text-sidebar-foreground">
          {/* Ticket badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/15 shadow-lg shadow-primary/25">
            <Ticket className="h-7 w-7 text-primary" />
          </div>

          <DialogTitle className="mt-4 text-2xl font-black leading-tight text-sidebar-foreground">
            SURE ODDS <span className="text-primary">2+</span>
            <span className="mt-1 block text-lg font-extrabold text-sidebar-foreground">
              DAILY TICKET / DNEVNI TIKET
            </span>
          </DialogTitle>

          <p className="mt-2 text-xs text-sidebar-foreground/70">
            High-confidence picks • Odds <span className="font-bold text-primary">&gt; 2.00</span> / Sigurni izbori • Kvota <span className="font-bold text-primary">&gt; 2.00</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3.5 bg-card p-5 text-center">
          {/* Feature grid */}
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-primary/30 bg-secondary/55 sm:grid-cols-4">
            {[
              { icon: "🎯", top: "HIGH ODDS / VISOKA KVOTA", bottom: "> 2.00", accent: true },
              { icon: "🛡️", top: "CAREFULLY / PAŽLJIVO", bottom: "SELECTED / IZABRANO" },
              { icon: "📊", top: "FULL MATCH / PUNA", bottom: "ANALYSIS / ANALIZA" },
              { icon: "🔥", top: "HOT PICKS / VRUĆI IZBORI", bottom: "DAILY / DNEVNO" },
            ].map((f) => (
              <div key={f.top} className="flex min-h-20 flex-col items-center justify-center gap-1 border-b border-r border-primary/15 px-2 py-2.5">
                <span className="text-base leading-none">{f.icon}</span>
                <span className="text-[9px] font-bold leading-tight text-foreground">{f.top}</span>
                <span className={`text-[9px] font-bold leading-tight ${f.accent ? "text-success" : "text-primary"}`}>
                  {f.bottom}
                </span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex w-full items-center gap-3 rounded-lg border border-primary/35 bg-secondary/45 px-3 py-3">
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-foreground">
                🔥 <span className="text-primary">{socialCount} users</span> unlocked this / {socialCount} korisnika je otključalo
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Join winners. Get your edge today. / Pridruži se pobeđivačima. Uzmi prednost danas.</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-success bg-success/10">
              <span className="text-sm font-black leading-none text-success">85%</span>
              <span className="mt-0.5 text-[7px] font-bold leading-none text-success">ACCURACY</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-primary/40 bg-secondary/35 p-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground line-through decoration-destructive">€7.99</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black leading-none text-primary">
                  {SURE_ODDS_PRICE_LABEL}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">ONE-TIME ACCESS / JEDNOKRATAN PRISTUP</span>
              </div>
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border border-primary/50 bg-primary/10">
                <span className="text-[8px] font-black leading-none text-primary">SAVE</span>
                <span className="text-xs font-black leading-none text-primary">50%</span>
              </div>
            </div>

            <Button
              onClick={handleGetTicket}
              className="h-12 w-full rounded-lg bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 sm:text-base"
            >
              GET TODAY'S TICKET / UZMI TIKET
            </Button>

            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              INSTANT ACCESS AFTER PAYMENT / TRENUTAN PRISTUP NAKON PLAĆANJA
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="h-8 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Continue Free / Nastavi besplatno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

