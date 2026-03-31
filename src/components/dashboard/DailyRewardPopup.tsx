import { useState, useEffect } from "react";
import { X, Gift, Clock, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const POPUP_DELAY = 8000;
const DISMISS_KEY = "daily_reward_popup_dismissed";

export function DailyRewardPopup() {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed).toDateString();
      if (dismissedDate === new Date().toDateString()) return;
    }

    const timer = setTimeout(() => setVisible(true), POPUP_DELAY);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  const handleClaim = () => {
    dismiss();
    if (!user) {
      navigate("/login");
    } else {
      // Scroll to top where the widget is
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-amber-400/40 bg-card shadow-2xl shadow-amber-500/10 overflow-visible">
        <button
          onClick={dismiss}
          className="absolute -top-3 -right-3 z-10 rounded-full bg-muted border border-border p-1.5 hover:bg-destructive/20 transition-colors"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>

        <div className="p-6 space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center border border-amber-400/30">
            <Gift className="h-8 w-8 text-amber-400 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-foreground">
              🎁 Don't Miss Today's Reward
            </h3>
            <p className="text-sm text-muted-foreground">
              Collect <span className="text-primary font-bold">AI Arena points</span> every day
              and unlock <span className="text-amber-400 font-bold">exclusive predictions</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              ⏳ Your streak starts now
            </div>
            <div className="flex items-center gap-1 text-destructive font-semibold">
              <Flame className="h-3.5 w-3.5" />
              Don't lose it!
            </div>
          </div>

          <button
            onClick={handleClaim}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] py-3 text-sm font-bold text-white shadow-lg shadow-[hsl(30,100%,50%)]/20 hover:opacity-90 transition-opacity animate-pulse"
          >
            🚀 {user ? "Claim Now" : "Sign In & Claim"}
          </button>

          <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
