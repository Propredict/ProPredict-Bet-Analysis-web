import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePlatform } from "@/hooks/usePlatform";
import { setOneSignalTag } from "@/components/AndroidPushModal";
import { usePushSubscriptionStatus, enablePushViabridge } from "@/hooks/usePushSubscriptionStatus";
import { logPushPreferenceChange } from "@/hooks/usePushAnalytics";

/**
 * Compact WC notifications opt-in.
 * Mirrors the wc_alerts toggle in Settings: kickoff, goal, FT pushes for all WC matches.
 * Android-only (Web push is not supported in this project).
 */
export default function WCNotifyToggle() {
  const { isAndroidApp } = usePlatform();
  const pushState = usePushSubscriptionStatus();
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wc_alerts_enabled") !== "false";
  });

  useEffect(() => {
    if (!isAndroidApp) return;
    // Ensure tag reflects current preference on mount
    setOneSignalTag("wc_alerts", enabled ? "true" : "false");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAndroidApp) return null;

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
      localStorage.setItem("wc_alerts_enabled", "true");
      localStorage.removeItem("push_disabled_at");
      if (pushState === "opted_out") {
        enablePushViabridge();
      } else {
        window.Android?.requestPushPermission?.();
      }
      logPushPreferenceChange("wc_alerts_enabled", "wc_portal");
    } else {
      localStorage.setItem("wc_alerts_enabled", "false");
      logPushPreferenceChange("wc_alerts_disabled", "wc_portal");
    }
    setOneSignalTag("wc_alerts", checked ? "true" : "false");
  };

  return (
    <div className="mx-3 sm:mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {enabled ? (
          <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
          <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-foreground leading-tight">
            Notify me for all WC matches
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight truncate">
            Kickoff · Goals · Full-time
          </div>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}