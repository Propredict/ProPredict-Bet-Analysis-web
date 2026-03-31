import { useState } from "react";
import { X, Gift, Smartphone } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const DISMISS_KEY = "reward_bar_dismissed";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

/**
 * Sticky bar at bottom — Website only.
 * Promotes daily rewards available in the app.
 */
export function DailyRewardStickyBar() {
  const isAndroid = getIsAndroidApp();

  const [dismissed, setDismissed] = useState(() => {
    const d = localStorage.getItem(DISMISS_KEY);
    if (!d) return false;
    return new Date(d).toDateString() === new Date().toDateString();
  });

  if (isAndroid || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[45] bg-gradient-to-r from-amber-500/95 to-[hsl(30,100%,50%)]/95 backdrop-blur-sm border-t border-amber-300/30 shadow-lg shadow-amber-500/20">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-3 py-2 sm:py-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="h-4 w-4 text-white shrink-0 animate-bounce" />
          <span className="text-xs sm:text-sm font-bold text-white truncate">
            🎁 Daily AI Rewards are LIVE
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            <Smartphone className="h-3 w-3" />
            Unlock in App 🚀
          </a>
          <button onClick={dismiss} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
