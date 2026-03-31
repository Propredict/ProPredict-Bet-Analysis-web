import { Gift, Flame, Lock, Smartphone, Trophy, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

export function DailyRewardWidget() {
  return (
    <Card className="relative overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-0">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(45,100%,50%,0.08),transparent_60%)]" />

      <div className="relative p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Gift className="h-6 w-6 text-amber-400 animate-bounce" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-ping" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-foreground">
              🎁 Your Daily Reward is Waiting
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-400/30 rounded-full px-2 py-0.5">
            <Lock className="h-2.5 w-2.5" /> App Only
          </span>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
            <Trophy className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-foreground">Collect AI Arena points <span className="font-bold text-primary">every day</span></span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs text-foreground">Unlock <span className="font-bold text-amber-400">premium picks</span> for free</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
            <Flame className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs text-foreground">Build streaks for <span className="font-bold text-destructive">bonus rewards</span></span>
          </div>
        </div>

        {/* FOMO + Streak preview */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-primary/10 rounded-lg p-3 border border-amber-400/20">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1 justify-center sm:justify-start">
              <Flame className="h-3.5 w-3.5 text-destructive" />
              Build your 7-day streak &amp; unlock bonus rewards
            </p>
            <p className="text-[10px] text-muted-foreground">
              🔥 1,200+ users already claiming daily rewards
            </p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className="w-6 h-6 rounded-full border border-border/50 bg-muted/40 flex items-center justify-center text-[8px] font-bold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] py-3 text-sm sm:text-base font-bold text-white shadow-lg shadow-[hsl(30,100%,50%)]/20 hover:opacity-90 transition-opacity animate-pulse"
        >
          <Smartphone className="h-4 w-4" />
          🚀 Claim Now in App
        </a>
      </div>
    </Card>
  );
}
