import { Gift, Flame, Lock, Trophy, Zap, Check, Loader2, Star, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDailyReward } from "@/hooks/useDailyReward";
import { useAuth } from "@/hooks/useAuth";
import { DailyRewardClaimPopup } from "./DailyRewardClaimPopup";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";

const STREAK_POINTS = [0, 2, 3, 4, 5, 6, 8, 15];
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

/**
 * Website: info-only widget promoting the app feature
 * Android: full functional claim widget with streak tracking
 */
export function DailyRewardWidget() {
  const isAndroid = getIsAndroidApp();

  if (isAndroid) {
    return <AndroidRewardWidget />;
  }
  return <WebRewardWidget />;
}

/* ─── WEBSITE: Info-only widget ─── */
function WebRewardWidget() {
  return (
    <Card className="relative overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-0">
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

        {/* Streak preview (FOMO) */}
        <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 rounded-lg p-3 border border-amber-400/20 space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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
          <div className="text-[10px] text-muted-foreground space-y-0.5 pl-1">
            <p>🆓 Free → <span className="text-primary font-semibold">3 days Pro</span> · ⭐ Pro → <span className="text-primary font-semibold">1 day Premium</span> · 👑 Premium → <span className="text-amber-400 font-semibold">+8 bonus pts</span></p>
          </div>
        </div>
        </div>

        {/* CTA → App */}
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

/* ─── ANDROID: Full functional claim widget ─── */
function AndroidRewardWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
            Sign in to start collecting daily points, build streaks, and unlock premium predictions!
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

  const displayStreak = currentStreak;
  const progressPercent = (displayStreak / 7) * 100;

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
              <p className="text-lg font-bold text-foreground">{totalPoints}</p>
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
                const isBonus = day === 7;

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
                      ) : isBonus ? (
                        <Star className="h-3.5 w-3.5" />
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

          {/* Day 7 bonus info - tiered */}
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-bold">Day 7 Streak Bonus:</span>
            </div>
            <div className="pl-6 space-y-0.5 text-muted-foreground">
              <p>🆓 Free users → <span className="text-primary font-semibold">3 days Pro access</span></p>
              <p>⭐ Pro users → <span className="text-primary font-semibold">1 day Premium access</span></p>
              <p>👑 Premium users → <span className="text-amber-400 font-semibold">+8 extra bonus points</span></p>
            </div>
          </div>

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
          isBonusDay={lastClaimResult.isBonusDay}
          bonusReward={lastClaimResult.bonusReward}
          onClose={dismissClaimResult}
        />
      )}
    </>
  );
}
