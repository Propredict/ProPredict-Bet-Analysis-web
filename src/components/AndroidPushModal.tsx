import { useState, useEffect, useCallback } from "react";
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

type ModalStep = "goal" | "tips" | null;

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function shouldShowPrompt(enabledKey: string, lastShownKey: string): boolean {
  if (localStorage.getItem(enabledKey) === "true") return false;
  const lastShown = localStorage.getItem(lastShownKey);
  if (!lastShown) return true;
  return Date.now() - parseInt(lastShown, 10) > TWO_DAYS_MS;
}

/** Set or remove a OneSignal tag via the Web SDK deferred queue */
function setOneSignalTag(key: string, value: string | null) {
  try {
    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal: any) => {
      if (value) {
        await OneSignal.User.addTag(key, value);
        console.log(`[OneSignal] Tag set: ${key}=${value}`);
      } else {
        await OneSignal.User.removeTag(key);
        console.log(`[OneSignal] Tag removed: ${key}`);
      }
    });
  } catch (e) {
    console.warn("[OneSignal] Tag operation failed:", e);
  }
}

export { setOneSignalTag };

export function AndroidPushModal() {
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
    const isAndroid = typeof window !== "undefined" && window.Android !== undefined;
    if (!isAndroid || loading || !user) return;

    if (localStorage.getItem("onesignal_player_id")) return;

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
    setStep(null);
  };

  const handleTipsLater = () => {
    localStorage.setItem("tips_prompt_last_shown", String(Date.now()));
    setStep(null);
  };

  return (
    <>
      {/* ⚽ Goal Alerts Modal */}
      <Dialog open={step === "goal"} onOpenChange={(v) => { if (!v) handleGoalLater(); }}>
        <DialogContent className="sm:max-w-[380px] gap-5">
          <DialogHeader className="items-center text-center gap-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Goal className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">⚽ Enable Goal Alerts</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Get instant live goal notifications during matches.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={handleGoalEnable} className="w-full">
              Allow Goal Alerts
            </Button>
            <Button variant="ghost" onClick={handleGoalLater} className="w-full text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🎯 Daily Tips Modal */}
      <Dialog open={step === "tips"} onOpenChange={(v) => { if (!v) handleTipsLater(); }}>
        <DialogContent className="sm:max-w-[380px] gap-5">
          <DialogHeader className="items-center text-center gap-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">🎯 Enable Daily AI Picks & Combos</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Receive high-probability AI predictions directly on your phone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={handleTipsEnable} className="w-full">
              Allow Daily Picks
            </Button>
            <Button variant="ghost" onClick={handleTipsLater} className="w-full text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
