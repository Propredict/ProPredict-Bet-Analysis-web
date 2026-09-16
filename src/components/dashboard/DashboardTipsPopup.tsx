import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Ticket, Crown, Diamond, Target, ChevronRight, X } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { canShowPopup, markPopupShown, msUntilNextPopup } from "@/lib/popupCooldown";

const SESSION_KEY = "propredict:tips_popup_shown_v7";

const categories = [
  { label: "🎯 Risk of the Day", sub: "🔥 High odds pick • Unlock instantly", icon: Target, color: "text-primary", path: "/risk-of-the-day" },
  { label: "Sure Odds 2+ Ticket", sub: "🎫 Daily ticket • Higher confidence", icon: Ticket, color: "text-primary", path: "/exclusive-tickets" },
  { label: "💎 Diamond Pick", sub: "💎 Best value pick today • Top confidence", icon: Diamond, color: "text-primary", path: "/diamond-pick" },
  { label: "Premium Picks", sub: "🔒 Exclusive picks • Members only", icon: Crown, color: "text-primary", path: "/premium-tips" },
  { label: "Daily Picks", sub: "✅ Free picks available today", icon: Sparkles, color: "text-primary", path: "/daily-tips" },
];

export function DashboardTipsPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }

    // Android: delay to 55s so it appears AFTER Rating popup (~40s) finishes,
    // preventing the "Choose Your Picks" modal from overlapping the rating dialog.
    // Web: small delay so dashboard renders first.
    const initialDelay = isAndroid ? 55000 : 1500;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        // Skip if rating popup is currently open (avoid double-modal collision)
        const ratingOpen = document.querySelector('[data-rating-popup-open="true"]');
        if (ratingOpen) {
          schedule(20000);
          return;
        }
        if (!canShowPopup(45_000)) {
          schedule(Math.max(5_000, msUntilNextPopup(45_000) + 1_000));
          return;
        }
        setOpen(true);
        markPopupShown();
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      }, delay);
    };
    schedule(initialDelay);
    return () => clearTimeout(timer);
  }, [isAndroid]);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[340px] p-0 gap-0 overflow-hidden rounded-2xl border border-primary/40 bg-sidebar text-sidebar-foreground shadow-2xl shadow-primary/15 [&>button]:hidden">
        {/* Top glow line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3 text-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 h-8 w-8 rounded-full bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <DialogTitle className="text-base font-bold text-sidebar-foreground">
            Choose Your Picks 🔥
          </DialogTitle>
          <p className="mt-0.5 text-xs text-sidebar-foreground/70">
            Select what you want to unlock today
          </p>
        </div>

        {/* Options */}
        <div className="px-4 pb-2 space-y-1.5">
          {categories.map((cat, i) => (
            <div key={cat.path}>
              <Button
                variant="ghost"
                onClick={() => goTo(cat.path)}
                className="group flex h-auto w-full items-center gap-3 rounded-xl border border-sidebar-foreground/10 bg-sidebar-foreground/10 p-3 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground"
              >
                <cat.icon className={`h-5 w-5 shrink-0 ${cat.color}`} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold leading-tight text-sidebar-foreground">{cat.label}</p>
                  <p className="text-[11px] leading-tight text-sidebar-foreground/65">{cat.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-colors group-hover:text-sidebar-foreground" />
              </Button>
              {i < categories.length - 1 && (
                <div className="mx-3 mt-1.5 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
              )}
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4 pt-1.5">
          <Button
            variant="ghost"
            className="w-full text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            onClick={() => setOpen(false)}
          >
            Continue → Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
