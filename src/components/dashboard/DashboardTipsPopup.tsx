import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ChevronRight, Star, Crown } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const SESSION_KEY = "propredict:tips_popup_shown_v4";

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
      <DialogContent className="max-w-[340px] p-0 gap-0 border-0 !bg-white dark:!bg-slate-50 overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 text-center">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Today's Predictions
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Fresh AI analysis is ready for you
          </p>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-slate-100" />

        {/* Options */}
        <div className="p-4 space-y-2">
          {/* Daily */}
          <button
            onClick={() => goTo("/daily-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/8 to-primary/3 border border-primary/15 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="p-2 rounded-lg bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-slate-800">Daily Tips</p>
              <p className="text-[10px] text-slate-400">Free predictions</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Exclusive */}
          <button
            onClick={() => goTo("/pro-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/30 border border-amber-200/50 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="p-2 rounded-lg bg-amber-100">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-slate-800">Exclusive Tips</p>
              <p className="text-[10px] text-amber-500/70">Higher confidence</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Premium */}
          <button
            onClick={() => goTo("/premium-analysis")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-50 to-fuchsia-50/30 border border-fuchsia-200/50 hover:border-fuchsia-300 hover:shadow-sm transition-all group"
          >
            <div className="p-2 rounded-lg bg-fuchsia-100">
              <Crown className="h-4 w-4 text-fuchsia-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-slate-800">Premium Tips</p>
              <p className="text-[10px] text-fuchsia-500/70">Members only</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-fuchsia-500 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4">
          <button
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-500 transition-colors"
            onClick={() => setOpen(false)}
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
