import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ChevronRight, Star, Crown } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "propredict:tips_popup_shown_v3";

export function DashboardTipsPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    // Only show once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }

    // On Android delay 3s to avoid clashing with auth / interstitial
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
      <DialogContent className="max-w-sm p-0 gap-0 border-border !bg-white dark:!bg-slate-50 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="inline-flex p-2.5 rounded-xl bg-primary/20 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900">
            Today's Predictions Are Ready!
          </DialogTitle>
          <p className="text-[11px] text-slate-500 mt-1">
            Fresh AI-powered analysis waiting for you
          </p>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2.5">
          <button
            onClick={() => goTo("/daily-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="p-1.5 rounded-md bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">Daily Tips</p>
              <p className="text-[10px] text-slate-500">Free predictions</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => goTo("/pro-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
          >
            <div className="p-1.5 rounded-md bg-amber-500/15">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">Exclusive Tips</p>
              <p className="text-[10px] text-slate-500">Higher confidence</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
          </button>

          <button
            onClick={() => goTo("/premium-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-fuchsia-500/20 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all group"
          >
            <div className="p-1.5 rounded-md bg-fuchsia-500/15">
              <Crown className="h-4 w-4 text-fuchsia-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">Premium Tips</p>
              <p className="text-[10px] text-slate-500">Members only</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-fuchsia-500 transition-colors" />
          </button>
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            className="w-full text-xs text-slate-400"
            onClick={() => setOpen(false)}
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
