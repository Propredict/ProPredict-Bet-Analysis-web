import { useState, useEffect, useCallback, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Goal, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { determinePushState } from "@/hooks/usePushSubscriptionStatus";
import { logPushPreferenceChange } from "@/hooks/usePushAnalytics";

type ModalStep = "goal" | "tips" | null;

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Check if push was explicitly disabled and cooldown hasn't expired */
function isPushDisabledCooldownActive(): boolean {
  const disabledAt = localStorage.getItem("push_disabled_at");
  if (!disabledAt) return false;
  return Date.now() - parseInt(disabledAt, 10) < SEVEN_DAYS_MS;
}

/** Check if push was disabled more than 7 days ago (eligible for soft reminder) */
export function isPushReminderEligible(): boolean {
  const disabledAt = localStorage.getItem("push_disabled_at");
  if (!disabledAt) return false;
  return Date.now() - parseInt(disabledAt, 10) >= SEVEN_DAYS_MS;
}

function shouldShowPrompt(enabledKey: string, lastShownKey: string): boolean {
  if (localStorage.getItem(enabledKey) === "true") return false;
  // If user explicitly disabled and cooldown is active, don't show
  if (isPushDisabledCooldownActive()) return false;
  const lastShown = localStorage.getItem(lastShownKey);
  if (!lastShown) return true;
  return Date.now() - parseInt(lastShown, 10) > TWO_DAYS_MS;
}

/** Set or remove a OneSignal tag via native bridge (Android) or Web SDK (web) */
function setOneSignalTag(key: string, value: string | null) {
  try {
    const w = window as any;

    // Android native bridge: use Kotlin setTag / removeTag
    if (w.Android?.setOneSignalTag) {
      if (value) {
        w.Android.setOneSignalTag(key, value);
        console.log(`[OneSignal][Android] Tag set via bridge: ${key}=${value}`);
      } else {
        w.Android.removeOneSignalTag?.(key);
        console.log(`[OneSignal][Android] Tag removed via bridge: ${key}`);
      }
      return;
    }

    // Web SDK fallback
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal: any) => {
      if (value) {
        await OneSignal.User.addTag(key, value);
        console.log(`[OneSignal][Web] Tag set: ${key}=${value}`);
      } else {
        await OneSignal.User.removeTag(key);
        console.log(`[OneSignal][Web] Tag removed: ${key}`);
      }
    });
  } catch (e) {
    console.warn("[OneSignal] Tag operation failed:", e);
  }
}

export { setOneSignalTag };

/**
 * Sync the full favorites list as a single CSV OneSignal tag.
 * Format: ",id1,id2,id3," — commas on both ends for safe `contains` filtering.
 * Replaces the old per-match favorite_match_* tags to avoid the 409 tag-limit error.
 */
export function syncFavoritesTag(favoriteIds: Set<string>) {
  if (favoriteIds.size === 0) {
    setOneSignalTag("favorites", null);
  } else {
    const csv = "," + Array.from(favoriteIds).join(",") + ",";
    setOneSignalTag("favorites", csv);
  }
}

export const AndroidPushModal = forwardRef<HTMLDivElement>((_, ref) => {
  const [step, setStep] = useState<ModalStep>(null);
  const { user, loading } = useAuth();

  const advanceToNextStep = useCallback((afterGoal: boolean) => {
    if (afterGoal && shouldShowPrompt("tips_enabled", "tips_prompt_last_shown")) {
      setTimeout(() => setStep("tips"), 600);
    } else {
      setStep(null);
    }
  }, []);

  useEffect(() => {
    const isAndroid = getIsAndroidApp();
    console.log("[AndroidPushModal] Check: isAndroid=", isAndroid, "loading=", loading, "user=", !!user, "goal_enabled=", localStorage.getItem("goal_enabled"), "tips_enabled=", localStorage.getItem("tips_enabled"));
    if (!isAndroid || loading || !user) return;

    // Skip only if user already enabled both prompts
    if (localStorage.getItem("goal_enabled") === "true" && localStorage.getItem("tips_enabled") === "true") return;

    // Check real native push state — only show modal if push is fully active or unknown
    const pushState = determinePushState();
    if (pushState === "no_permission" || pushState === "opted_out") {
      console.log("[AndroidPushModal] Push state is", pushState, "— skipping modal");
      return;
    }

    const needGoal = shouldShowPrompt("goal_enabled", "goal_prompt_last_shown");
    const needTips = shouldShowPrompt("tips_enabled", "tips_prompt_last_shown");

    if (!needGoal && !needTips) return;

    const timer = setTimeout(() => {
      setStep(needGoal ? "goal" : "tips");
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, loading]);

  // ── Goal Handlers ──
  const handleGoalEnable = () => {
    window.Android?.requestPushPermission?.();
    localStorage.setItem("goal_enabled", "true");
    localStorage.setItem("goal_prompt_last_shown", String(Date.now()));
    setOneSignalTag("goal_alerts", "true");
    logPushPreferenceChange("goal_enabled", "modal");
    setStep(null);
    advanceToNextStep(true);
  };

  const handleGoalLater = () => {
    localStorage.setItem("goal_prompt_last_shown", String(Date.now()));
    setStep(null);
    advanceToNextStep(true);
  };

  // ── Tips Handlers ──
  const handleTipsEnable = () => {
    window.Android?.requestPushPermission?.();
    localStorage.setItem("tips_enabled", "true");
    localStorage.setItem("tips_prompt_last_shown", String(Date.now()));
    setOneSignalTag("daily_tips", "true");
    logPushPreferenceChange("tips_enabled", "modal");
    setStep(null);
  };

  const handleTipsLater = () => {
    localStorage.setItem("tips_prompt_last_shown", String(Date.now()));
    setStep(null);
  };

  return (
    <div ref={ref}>
      {/* ⚽ Goal Alerts Modal */}
      <Dialog open={step === "goal"} onOpenChange={(v) => { if (!v) handleGoalLater(); }}>
        <DialogContent className="sm:max-w-[380px] gap-5">
          <DialogHeader className="items-center text-center gap-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Goal className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">🔔 Enable Goal Alerts</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Get instant live goal notifications even when your phone is locked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={handleGoalEnable} className="w-full">
              Enable Goal Alerts
            </Button>
            <Button variant="ghost" onClick={handleGoalLater} className="w-full text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🎯 Daily Predictions Modal */}
      <Dialog open={step === "tips"} onOpenChange={(v) => { if (!v) handleTipsLater(); }}>
        <DialogContent className="sm:max-w-[380px] gap-5">
          <DialogHeader className="items-center text-center gap-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">🔥 Enable Daily AI Tips</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Receive high-probability AI predictions and ticket updates instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={handleTipsEnable} className="w-full">
              Enable Tips
            </Button>
            <Button variant="ghost" onClick={handleTipsLater} className="w-full text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

AndroidPushModal.displayName = "AndroidPushModal";
