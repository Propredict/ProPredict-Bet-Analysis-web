import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BatteryFull, ChevronRight } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const STORAGE_KEY = "battery_opt_prompt_dismissed";

/**
 * Shows a one-time prompt on Android after push notifications are enabled,
 * guiding users to disable battery optimization for reliable delivery.
 */
export function BatteryOptimizationPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getIsAndroidApp()) return;

    // Only show if push was enabled AND prompt not yet dismissed
    const goalEnabled = localStorage.getItem("goal_enabled") === "true";
    const tipsEnabled = localStorage.getItem("tips_enabled") === "true";
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true";

    if (!dismissed && (goalEnabled || tipsEnabled)) {
      // Show after a short delay so it doesn't overlap the push modals
      const timer = setTimeout(() => setOpen(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOpenSettings = () => {
    window.Android?.openBatterySettings?.();
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-[400px] gap-5">
        <DialogHeader className="items-center text-center gap-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <BatteryFull className="h-7 w-7 text-emerald-500" />
          </div>
          <DialogTitle className="text-lg">⚡ Keep Notifications Reliable</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Android may block notifications when the app is closed to save battery.
            To ensure you never miss a goal alert or tip, set ProPredict to{" "}
            <span className="font-semibold text-foreground">"Unrestricted"</span> in battery settings.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground text-sm">How to do it:</p>
          <div className="flex items-center gap-2">
            <span>1.</span>
            <span>Tap "Open Settings" below</span>
          </div>
          <div className="flex items-center gap-2">
            <span>2.</span>
            <span>Find <span className="font-medium text-foreground">ProPredict</span> in the app list</span>
          </div>
          <div className="flex items-center gap-2">
            <span>3.</span>
            <span>Select <span className="font-medium text-foreground">"Unrestricted"</span></span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <Button onClick={handleOpenSettings} className="w-full gap-2">
            Open Settings
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
            I'll do it later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
