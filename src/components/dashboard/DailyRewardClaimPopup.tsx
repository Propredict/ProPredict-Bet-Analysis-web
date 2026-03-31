import { X, Gift, Trophy, Flame } from "lucide-react";

interface Props {
  streakDay: number;
  pointsEarned: number;
  totalPoints: number;
  onClose: () => void;
}

export function DailyRewardClaimPopup({ streakDay, pointsEarned, totalPoints, onClose }: Props) {
  const pointsTo1000 = Math.max(0, 1000 - totalPoints);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-amber-400/40 bg-card shadow-2xl shadow-amber-500/10 overflow-visible">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 rounded-full bg-muted border border-border p-1.5 hover:bg-destructive/20 transition-colors"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>

        <div className="p-6 space-y-4 text-center">
          {/* Celebration icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/30 to-primary/20 flex items-center justify-center border-2 border-amber-400/40 animate-bounce">
            <Gift className="h-10 w-10 text-amber-400" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-foreground">
              🔥 Daily Reward Claimed!
            </h3>
            <p className="text-3xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
              +{pointsEarned} Points
            </p>
          </div>

          {/* Streak info */}
          <div className="flex items-center justify-center gap-3 bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-foreground">Day {streakDay}/7</span>
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{totalPoints} Arena Pts</span>
            </div>
          </div>

          {/* 1000 points milestone info */}
          {pointsTo1000 > 0 ? (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-1">
              <p className="text-xs font-bold text-primary">
                🎯 {pointsTo1000} points to unlock FREE subscription upgrade!
              </p>
              <p className="text-[10px] text-muted-foreground">
                Reach 1,000 Arena Points for a free month of Pro/Premium
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/30">
              <p className="text-xs font-bold text-amber-400">
                🎉 You've reached 1,000+ points! Reward available!
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Come back tomorrow to keep your streak going! 🚀
          </p>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary/10 border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            Awesome! 🎯
          </button>
        </div>
      </div>
    </div>
  );
}
