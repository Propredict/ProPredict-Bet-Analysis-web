import { useState, useEffect } from "react";
import { Star, Heart, ChevronRight } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CARD_DISMISSED_KEY = "propredict:rate_card_dismissed";
const FIRST_SEEN_KEY = "propredict:first_seen_at";
const MIN_DAYS = 0;

/**
 * Inline rating card on the dashboard.
 * Shown only on Android for all user tiers (free, pro, premium).
 */
export function RateAppCard({ onRate }: { onRate: () => void }) {
  const isAndroid = getIsAndroidApp();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Ensure first_seen is always set
    try {
      if (!localStorage.getItem(FIRST_SEEN_KEY)) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      }
    } catch {}

    // Check if already rated
    (supabase as any)
      .from("app_ratings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) return; // Already rated

        // Check dismiss (7 day cooldown)
        try {
          const dismissed = localStorage.getItem(CARD_DISMISSED_KEY);
          if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) return;
        } catch {}

        // Check usage time
        const firstSeen = parseInt(localStorage.getItem(FIRST_SEEN_KEY) || "0", 10);
        const daysSince = firstSeen ? (Date.now() - firstSeen) / (24 * 60 * 60 * 1000) : 0;
        if (daysSince >= MIN_DAYS) {
          setVisible(true);
        }
      });
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(CARD_DISMISSED_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5 p-4 animate-fade-in">
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-400/10 blur-2xl" />
      
      <div className="relative flex items-start gap-3">
        {/* Animated emoji */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/20 flex items-center justify-center">
          <span className="text-2xl animate-bounce" style={{ animationDuration: "2s" }}>💛</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">
            Enjoying ProPredict? 
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Your rating means a lot to us! Earn <span className="font-bold text-amber-500">+50 points</span> ⭐
          </p>

          {/* Mini star preview */}
          <div className="flex items-center gap-3 mt-2.5">
            <button
              onClick={onRate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all active:scale-95"
            >
              <Star className="h-3.5 w-3.5 fill-white" />
              Rate us
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              onClick={dismiss}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Later
            </button>
          </div>
        </div>

        {/* Heart decoration */}
        <Heart className="absolute top-0 right-0 h-3 w-3 text-red-400/40 fill-red-400/40" />
      </div>
    </div>
  );
}
