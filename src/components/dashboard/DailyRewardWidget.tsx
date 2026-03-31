import { Gift, Flame, Lock, Trophy, Zap, Check, Loader2, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDailyReward } from "@/hooks/useDailyReward";
import { useAuth } from "@/hooks/useAuth";
import { useArenaStats } from "@/hooks/useArenaStats";
import { DailyRewardClaimPopup } from "./DailyRewardClaimPopup";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";

const STREAK_POINTS = [0, 3, 6, 9, 12, 13, 14, 15];
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

export function DailyRewardWidget() {
  const isAndroid = getIsAndroidApp();
  if (isAndroid) return <AndroidRewardWidget />;
  return <WebRewardWidget />;
}

/* ─── WEBSITE: Info-only widget ─── */
function WebRewardWidget() {
  return (
    <Card className="relative overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(45,100%,50%,0.08),transparent_60%)]" />

      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-400 animate-bounce" />
            <h3 className="text-base sm:text-lg font-extrabold text-foreground">
              🎁 Collect daily AI points
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-400/30 rounded-full px-2 py-0.5">
            <Lock className="h-2.5 w-2.5" /> App Only
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Build your streak and unlock rewards ⚡
        </p>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] py-3 text-sm sm:text-base font-bold text-white shadow-lg shadow-[hsl(30,100%,50%)]/20 hover:opacity-90 transition-opacity animate-pulse"
        >
          <Smartphone className="h-4 w-4" />
          🚀 Unlock Rewards in App
        </a>
      </div>
    </Card>
  );
}

/* ─── ANDROID: Full functional claim widget ─── */
function AndroidRewardWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const arenaStats = useArenaStats();
  const {
    claimedToday,
    currentStreak,
    totalPoints,
    loading,
    claiming,
    claim,
    lastClaimResult,
    dismissClaimResult,
    nextDayPoints,
  } = useDailyReward();

  if (loading) {
    return (
      <Card className="p-6 border-2 border-amber-400/30 bg-card flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="relative overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(45,100%,50%,0.08),transparent_60%)]" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-400 animate-bounce" />
            <h3 className="text-base sm:text-lg font-extrabold text-foreground">
              🎁 Daily Reward – Claim Your AI Points
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to start collecting daily points and unlock free subscriptions at 1,000 points!
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] py-3 text-sm font-bold text-white shadow-lg animate-pulse"
          >
            🚀 Sign In to Claim
          </button>
        </div>
      </Card>
    );
  }

  // arena_user_stats.points is the single source of truth (daily + arena combined, resets at 1000)
  const combinedPoints = arenaStats.points || 0;
  const displayStreak = currentStreak;
  const progressPercent = (displayStreak / 7) * 100;
  const pointsTo1000 = Math.max(0, 1000 - combinedPoints);
  const milestoneProgress = Math.min(100, (combinedPoints / 1000) * 100);

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(45,100%,50%,0.08),transparent_60%)]" />

        <div className="relative p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Gift className="h-6 w-6 text-amber-400 animate-bounce" />
              {!claimedToday && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-ping" />
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-foreground">
              🎁 Daily Reward {claimedToday ? "– Claimed!" : "– Claim Your AI Points"}
            </h3>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 bg-muted/30 rounded-lg">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{combinedPoints}</p>
              <p className="text-[9px] text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center p-2.5 bg-muted/30 rounded-lg">
              <Flame className="h-4 w-4 mx-auto mb-1 text-destructive" />
              <p className="text-lg font-bold text-foreground">{displayStreak}/7</p>
              <p className="text-[9px] text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center p-2.5 bg-amber-500/10 rounded-lg border border-amber-400/20">
              <Zap className="h-4 w-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-amber-400">+{claimedToday ? STREAK_POINTS[currentStreak] || 2 : nextDayPoints}</p>
              <p className="text-[9px] text-amber-400/70">{claimedToday ? "Earned Today" : "Next Reward"}</p>
            </div>
          </div>

          {/* 7-day streak circles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Streak Progress</span>
              <span className="font-medium text-foreground">Day {displayStreak} / 7</span>
            </div>
            <div className="flex justify-between gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isCompleted = day <= displayStreak;
                const isCurrent = day === displayStreak + 1 && !claimedToday;

                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                        isCompleted
                          ? "bg-primary/20 border-primary text-primary"
                          : isCurrent
                          ? "border-amber-400 text-amber-400 bg-amber-400/10 animate-pulse"
                          : "border-border/50 text-muted-foreground bg-muted/30"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        day
                      )}
                    </div>
                    <span className={`text-[8px] font-medium ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>
                      +{STREAK_POINTS[day]}
                    </span>
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* 1000 Points Milestone */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground">🎯 1,000 Points Milestone</span>
              </div>
              <span className="text-[10px] font-semibold text-primary">{combinedPoints}/1,000</span>
            </div>
            <Progress value={milestoneProgress} className="h-1.5" />
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-1">
              <span>🎁 Daily: <span className="font-semibold text-foreground">{dailyPoints} pts</span></span>
              <span>⚔️ AI vs Members: <span className="font-semibold text-foreground">{arenaPoints} pts</span></span>
            </div>
            {pointsTo1000 > 0 ? (
              <div className="text-[10px] text-muted-foreground space-y-0.5 pl-1">
                <p>{pointsTo1000} pts to go! Rewards:</p>
                <p>🆓 Free → <span className="text-primary font-semibold">1 month Pro free</span></p>
                <p>⭐ Pro → <span className="text-primary font-semibold">+1 month Pro extended</span></p>
                <p>👑 Premium → <span className="text-amber-400 font-semibold">+1 month Premium extended</span></p>
              </div>
            ) : (
              <p className="text-[10px] text-amber-400 font-bold">🎉 Milestone reached! Reward applied!</p>
            )}
          </div>

          {/* Arena CTA */}
          <button
            onClick={() => navigate("/ai-vs-community")}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            ⚡ Play AI vs Members for more points!
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            🔥 1,200+ users already building their daily streaks
          </p>

          {/* CTA */}
          {!claimedToday ? (
            <button
              onClick={claim}
              disabled={claiming}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-[hsl(30,100%,50%)]/20 hover:opacity-90 transition-opacity animate-pulse disabled:opacity-50 disabled:animate-none"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  🚀 Claim Now – Earn +{nextDayPoints} Points
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary/10 border border-primary/30 py-3 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              ✅ Today's reward claimed! Come back tomorrow
            </div>
          )}
        </div>
      </Card>

      {lastClaimResult && (
        <DailyRewardClaimPopup
          streakDay={lastClaimResult.streakDay}
          pointsEarned={lastClaimResult.pointsEarned}
          totalPoints={combinedPoints}
          onClose={dismissClaimResult}
        />
      )}
    </>
  );
}
