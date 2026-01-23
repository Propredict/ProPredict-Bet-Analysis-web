import { X, Bell, BellRing, Goal, AlertTriangle, AlertCircle, Volume2, VolumeX, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GlobalAlertSettings } from "@/hooks/useGlobalAlertSettings";

interface GlobalAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalAlertSettings;
  onToggle: (key: keyof GlobalAlertSettings) => void;
}

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}

function SettingRow({ icon, title, description, checked, onChange, disabled, variant = "default" }: SettingRowProps) {
  const variantStyles = {
    default: {
      active: "border-green-500/50 bg-green-500/10",
      icon: "text-green-400",
      glow: "shadow-green-500/20",
    },
    success: {
      active: "border-green-500/50 bg-green-500/10",
      icon: "text-green-400",
      glow: "shadow-green-500/20",
    },
    warning: {
      active: "border-yellow-500/50 bg-yellow-500/10",
      icon: "text-yellow-400",
      glow: "shadow-yellow-500/20",
    },
    danger: {
      active: "border-red-500/50 bg-red-500/10",
      icon: "text-red-400",
      glow: "shadow-red-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
        disabled && "opacity-40 pointer-events-none",
        checked 
          ? `${styles.active} shadow-lg ${styles.glow}` 
          : "border-white/10 bg-white/5 hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
          checked ? `bg-gradient-to-br ${styles.active}` : "bg-white/10"
        )}>
          <div className={cn(checked ? styles.icon : "text-muted-foreground")}>
            {icon}
          </div>
        </div>
        <div>
          <p className={cn(
            "font-medium transition-colors",
            checked ? "text-foreground" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          "data-[state=checked]:bg-green-500",
          checked && "shadow-lg shadow-green-500/30"
        )}
      />
    </div>
  );
}

export function GlobalAlertsModal({ isOpen, onClose, settings, onToggle }: GlobalAlertsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1f2e] to-[#0f1318] shadow-2xl pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-orange-500/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center transition-all",
                  settings.enabled 
                    ? "bg-green-500/20 shadow-lg shadow-green-500/30" 
                    : "bg-white/10"
                )}>
                  {settings.enabled ? (
                    <BellRing className="h-5 w-5 text-green-400" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Goal Notifications</h3>
                  <p className="text-xs text-muted-foreground">Configure your alert preferences</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Master Toggle */}
            <div
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-300",
                settings.enabled
                  ? "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20"
                  : "border-white/20 bg-white/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                    settings.enabled 
                      ? "bg-green-500 shadow-lg shadow-green-500/50" 
                      : "bg-white/10"
                  )}>
                    <Bell className={cn(
                      "h-6 w-6 transition-colors",
                      settings.enabled ? "text-white" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Enable Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Get alerts for match events</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={() => onToggle("enabled")}
                  className="data-[state=checked]:bg-green-500 scale-110"
                />
              </div>
            </div>

            {/* Alert Types Section */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Alert Types
              </p>
              <div className="space-y-3">
                <SettingRow
                  icon={<Goal className="h-5 w-5" />}
                  title="Goals"
                  description="Get notified when a goal is scored"
                  checked={settings.notifyGoals}
                  onChange={() => onToggle("notifyGoals")}
                  disabled={!settings.enabled}
                  variant="success"
                />
                <SettingRow
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title="Red Cards"
                  description="Get notified for red card events"
                  checked={settings.notifyRedCards}
                  onChange={() => onToggle("notifyRedCards")}
                  disabled={!settings.enabled}
                  variant="danger"
                />
                <SettingRow
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Yellow Cards"
                  description="Get notified for yellow card events"
                  checked={settings.notifyYellowCards}
                  onChange={() => onToggle("notifyYellowCards")}
                  disabled={!settings.enabled}
                  variant="warning"
                />
              </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Preferences
              </p>
              <div className="space-y-3">
                <SettingRow
                  icon={settings.soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  title="Sound"
                  description="Play sound with notifications"
                  checked={settings.soundEnabled}
                  onChange={() => onToggle("soundEnabled")}
                  disabled={!settings.enabled}
                />
                <SettingRow
                  icon={<Star className="h-5 w-5" />}
                  title="Favorites Only"
                  description="Only alert for favorite matches"
                  checked={settings.favoritesOnly}
                  onChange={() => onToggle("favoritesOnly")}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/5">
            <p className="text-xs text-center text-muted-foreground">
              {settings.enabled ? (
                <span className="text-green-400">✓ Notifications are enabled</span>
              ) : (
                "Enable notifications to receive match alerts"
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
