import { Link, useNavigate } from "react-router-dom";
import { Gift, Flame, Lock, Trophy, Zap, Check, Loader2, Smartphone, Calendar, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDailyReward } from "@/hooks/useDailyReward";
import { useAuth } from "@/hooks/useAuth";
import { useArenaStats } from "@/hooks/useArenaStats";
import { DailyRewardClaimPopup } from "./DailyRewardClaimPopup";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import rewardChest from "@/assets/reward-treasure-chest.jpg";



const STREAK_POINTS = [0, 3, 6, 9, 12, 13, 14, 15];
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

export function DailyRewardWidget() {
  const isAndroid = getIsAndroidApp();
  if (isAndroid) return <AndroidRewardWidget />;
  return <WebRewardWidget />;
}

/* ─── WEBSITE: Premium info widget ─── */
function WebRewardWidget() {
  const { user } = useAuth();
  const { currentStreak, loading } = useDailyReward();
  const arenaStats = useArenaStats();

  const points = arenaStats.points || 0;
  const streak = currentStreak || 0;
  const isLoading = loading || arenaStats.loading;

  return (
    <Card className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 p-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(45,100%,50%,0.08),transparent_50%)]" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />

      <div className="relative p-4 sm:p-5 space-y-4">
        {/* Header + stats row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Gift className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                Collect daily <span className="text-amber-400">AI points</span>
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Reach 1,000 points and get 1 month Premium free <span className="text-amber-400">⚡</span>
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Current Streak</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground">
                {isLoading ? "–" : user ? streak : 0}{" "}
                <Flame className="inline h-4 w-4 sm:h-5 sm:w-5 text-amber-400 fill-amber-400" />
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">AI Points</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">
                {isLoading ? "–" : (user ? points : 0).toLocaleString()}
              </p>
            </div>
            <div className="hidden sm:block w-24 h-16 rounded-lg overflow-hidden border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <img
                src={rewardChest}
                alt="Treasure chest with AI points"
                className="w-full h-full object-cover"
                width={96}
                height={64}
                loading="lazy"
              />
            </div>
          </div>

          <span className="sm:hidden absolute top-4 right-4 flex items-center gap-1 text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-400/30 rounded-full px-2 py-0.5">
            <Smartphone className="h-3 w-3" /> App Only
          </span>
        </div>

        {/* Benefit cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">Daily Check-in</p>
              <p className="text-[10px] sm:text-xs text-primary font-bold">+3 to +15 pts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">Correct Prediction</p>
              <p className="text-[10px] sm:text-xs text-primary font-bold">+1 pt each</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Flame className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">7-Day Streak</p>
              <p className="text-[10px] sm:text-xs text-amber-400 font-bold">72 pts / week</p>
            </div>
          </div>
        </div>


        {/* CTA */}
        <Link
          to={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity"
        >
          <Smartphone className="h-4 w-4" />
          <span>Unlock Rewards in App</span>
          <TrendingUp className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>

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
      <Card className="p-6 border border-amber-500/30 bg-card flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(45,100%,50%,0.08),transparent_50%)]" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gift className="h-5 w-5" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-foreground">
              Daily Reward – Claim Your AI Points
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to start collecting daily points and unlock free subscriptions at 1,000 points!
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 py-3 text-sm font-bold text-white shadow-lg hover:opacity-95 transition-opacity"
          >
            Sign In to Claim
          </button>
        </div>
      </Card>
    );
  }

  const combinedPoints = arenaStats.points || 0;
  const displayStreak = currentStreak;
  const progressPercent = (displayStreak / 7) * 100;
  const pointsTo1000 = Math.max(0, 1000 - combinedPoints);
  const milestoneProgress = Math.min(100, (combinedPoints / 1000) * 100);

  return (
    <>
      <Card className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 p-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(45,100%,50%,0.08),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Gift className="h-5 w-5" />
                {!claimedToday && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-ping" />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                Daily Reward {claimedToday ? "– Claimed!" : "– Claim Your AI Points"}
              </h3>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 bg-muted/30 rounded-lg border border-border/60">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{combinedPoints}</p>
              <p className="text-[9px] text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center p-2.5 bg-muted/30 rounded-lg border border-border/60">
              <Flame className="h-4 w-4 mx-auto mb-1 text-amber-400" />
              <p className="text-lg font-bold text-foreground">{displayStreak}/7</p>
              <p className="text-[9px] text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center p-2.5 bg-amber-500/10 rounded-lg border border-amber-400/30">
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
                <span className="text-xs font-bold text-foreground">1,000 Points Milestone</span>
              </div>
              <span className="text-[10px] font-semibold text-primary">{combinedPoints}/1,000</span>
            </div>
            <Progress value={milestoneProgress} className="h-1.5" />
            {pointsTo1000 > 0 ? (
              <p className="text-[10px] text-muted-foreground pl-1">
                {pointsTo1000} pts to go! Check rewards in Profile.
              </p>
            ) : (
              <p className="text-[10px] text-amber-400 font-bold">Milestone reached! Reward applied!</p>
            )}
          </div>

          {/* Arena CTA */}
          <button
            onClick={() => navigate("/ai-vs-community")}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Play AI vs Members for more points!
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            1,200+ users already building their daily streaks
          </p>

          {/* CTA */}
          {!claimedToday ? (
            <button
              onClick={claim}
              disabled={claiming}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:animate-none"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Claim Now – Earn +{nextDayPoints} Points
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary/10 border border-primary/30 py-3 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              Today's reward claimed! Come back tomorrow
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
