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

    // Delay 2-3 seconds
    const delay = 2000 + Math.random() * 1000;
    const timer = setTimeout(() => {
      setIsOpen(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
        localStorage.setItem(LAST_SHOWN_KEY, new Date().toDateString());
      } catch {}
    }, delay);

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
        setIsOpen(true);
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

  const handleUpgrade = () => {
    setIsOpen(false);
    navigate("/get-premium");
  };

  if (isLoading || plan !== "free") return null;

  // Random social proof number 18-35
  const socialCount = 18 + Math.floor(Math.random() * 18);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden"
        style={{
          border: '1px solid rgba(20,184,166,0.3)',
          boxShadow: '0 0 30px rgba(20,184,166,0.12), 0 25px 50px -12px rgba(0,0,0,0.5)',
          background: 'linear-gradient(180deg, #0f172a, #020617)',
        }}
      >
        {/* Top glow */}
        <div className="h-[1px] w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)' }} />

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 p-1.5 rounded-full bg-secondary/60 hover:bg-secondary transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="p-5 pt-6 flex flex-col items-center text-center gap-3.5">
          {/* Icon */}
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>

          <DialogTitle className="text-base font-extrabold text-foreground leading-snug">
            🔥 Winning Tickets Locked
          </DialogTitle>

          <p className="text-xs text-muted-foreground">
            High-confidence picks waiting for you
          </p>

          {/* Benefits */}
          <div className="w-full text-left space-y-2 px-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>🎯 Top value picks</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>⚡ Early access</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>📊 Full analysis</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 justify-center">
            <Clock className="h-3 w-3" />
            Limited picks available today
          </p>

          <p className="text-xs text-amber-400 font-semibold">
            🔥 {socialCount} users unlocked in the last hour
          </p>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full h-13 text-base font-bold rounded-xl text-white"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #0f9b8e)',
              boxShadow: '0 0 20px rgba(245,158,11,0.3), 0 4px 15px rgba(15,155,142,0.2)',
            }}
          >
            Unlock Now 🚀
          </Button>

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
