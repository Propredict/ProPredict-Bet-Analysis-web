import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Star, Crown, Diamond, Target, ChevronRight, X } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const SESSION_KEY = "propredict:tips_popup_shown_v7";

const categories = [
  { label: "Daily Picks", sub: "Free", icon: Sparkles, color: "text-primary", path: "/daily-tips" },
  { label: "Pro Picks", sub: "🔒 Higher confidence", icon: Star, color: "text-amber-400", path: "/exclusive-tips" },
  { label: "Premium Picks", sub: "🔒 Members only", icon: Crown, color: "text-fuchsia-400", path: "/premium-tips" },
  { label: "💎 Diamond Pick", sub: "Most valuable today", icon: Diamond, color: "text-purple-400", path: "/diamond-pick" },
  { label: "🎯 Risk of the Day", sub: "High odds • Watch to unlock", icon: Target, color: "text-red-400", path: "/risk-of-the-day" },
];

export function DashboardTipsPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }

    const delay = isAndroid ? 12000 : 800;
    const timer = setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    }, delay);

    return () => clearTimeout(timer);
  }, [isAndroid]);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[340px] p-0 gap-0 border border-border/50 bg-card overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3 text-center">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-secondary/60 hover:bg-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <DialogTitle className="text-base font-bold text-foreground">
            Choose Your Picks 🔥
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select what you want to unlock today
          </p>
        </div>

        {/* Options */}
        <div className="px-4 pb-2 space-y-1.5">
          {categories.map((cat) => (
            <button
              key={cat.path}
              onClick={() => goTo(cat.path)}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors group"
            >
              <cat.icon className={`h-5 w-5 shrink-0 ${cat.color}`} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{cat.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4 pt-1.5">
          <button
            className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Continue → Dashboard
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
