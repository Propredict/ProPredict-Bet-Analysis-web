import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, ChevronRight, Star, Crown } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const SESSION_KEY = "propredict:tips_popup_shown_v6";

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
      <DialogContent className="max-w-[340px] p-0 gap-0 border-0 !bg-white overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden">
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
          <p className="text-xs text-primary mt-0.5">
            Fresh AI analysis is ready for you
          </p>
        </div>

        {/* Options */}
        <div className="px-4 pb-2 space-y-2.5">
          {/* Daily */}
          <button
            onClick={() => goTo("/daily-analysis")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-white/15">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-white">Daily Tips</p>
              <p className="text-[10px] text-white/70">Free predictions</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/70 animate-[pulse_1.5s_ease-in-out_infinite] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Exclusive */}
          <button
            onClick={() => goTo("/pro-analysis")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-white/15">
              <Star className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-white">Exclusive Tips</p>
              <p className="text-[10px] text-white/70">Higher confidence</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/70 animate-[pulse_1.5s_ease-in-out_infinite] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Premium */}
          <button
            onClick={() => goTo("/premium-analysis")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="p-2 rounded-lg bg-white/15">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-white">Premium Tips</p>
              <p className="text-[10px] text-white/70">Members only</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/70 animate-[pulse_1.5s_ease-in-out_infinite] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4 pt-2">
          <button
            className="w-full py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
            onClick={() => setOpen(false)}
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
