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
}

function SettingRow({ icon, title, description, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border-2 p-3.5 transition-all duration-200",
        disabled && "pointer-events-none opacity-60",
        checked
          ? "border-primary/80 bg-primary/10 shadow-md shadow-primary/20"
          : "border-primary/25 bg-card shadow-sm",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-secondary text-muted-foreground ring-1 ring-border",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold tracking-tight text-sidebar">{title}</p>
          <p className="text-xs font-semibold text-foreground/70">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-110" />
    </div>
  );
}

export function GlobalAlertsModal({ isOpen, onClose, settings, onToggle }: GlobalAlertsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-sidebar/85 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-primary/40 bg-card shadow-2xl shadow-primary/20 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary/80 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                  {settings.enabled ? (
                    <BellRing className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Bell className="h-5 w-5 text-primary-foreground/70" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-primary-foreground">Goal Notifications</h3>
                  <p className="text-xs font-medium text-primary-foreground/75">Configure your alert preferences</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-5">
            {/* Master Toggle */}
            <div
              className={cn(
                "rounded-xl border-2 p-4 transition-all duration-200",
                settings.enabled ? "border-primary/80 bg-primary/10 shadow-md shadow-primary/20" : "border-primary/25 bg-card shadow-sm",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                      settings.enabled ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-secondary text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-tight text-sidebar">Enable Push Notifications</p>
                    <p className="text-xs font-semibold text-foreground/70">Get alerts for match events</p>
                  </div>
                </div>
                <Switch checked={settings.enabled} onCheckedChange={() => onToggle("enabled")} className="scale-110" />
              </div>
            </div>

            {/* Alert Types Section */}
            <div className="space-y-2">
              <p className="px-1 text-xs font-extrabold uppercase tracking-widest text-sidebar">Alert Types</p>
              <div className="space-y-2.5">
                <SettingRow
                  icon={<Goal className="h-5 w-5" />}
                  title="Goals"
                  description="Get notified when a goal is scored"
                  checked={settings.notifyGoals}
                  onChange={() => onToggle("notifyGoals")}
                  disabled={!settings.enabled}
                />
                <SettingRow
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title="Red Cards"
                  description="Get notified for red card events"
                  checked={settings.notifyRedCards}
                  onChange={() => onToggle("notifyRedCards")}
                  disabled={!settings.enabled}
                />
                <SettingRow
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Yellow Cards"
                  description="Get notified for yellow card events"
                  checked={settings.notifyYellowCards}
                  onChange={() => onToggle("notifyYellowCards")}
                  disabled={!settings.enabled}
                />
              </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-2 pt-1">
              <p className="px-1 text-xs font-extrabold uppercase tracking-widest text-sidebar">Preferences</p>
              <div className="space-y-2.5">
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
          <div className="border-t-2 border-primary/20 bg-secondary/60 px-5 py-3.5">
            <p className="text-center text-xs font-bold">
              {settings.enabled ? (
                <span className="text-success">✓ Notifications are enabled</span>
              ) : (
                <span className="text-sidebar">Enable notifications to receive match alerts</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
