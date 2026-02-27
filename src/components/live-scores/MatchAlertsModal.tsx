import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Bell, BellRing, Goal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
}

interface MatchAlertsModalProps {
  match: Match | null;
  onClose: () => void;
}

interface AlertSettings {
  notifyGoals: boolean;
  notifyRedCards: boolean;
}

export function MatchAlertsModal({ match, onClose }: MatchAlertsModalProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AlertSettings>({
    notifyGoals: false,
    notifyRedCards: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  const fetchAlertSettings = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !isMounted.current) {
        if (isMounted.current) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("match_alerts")
        .select("notify_goals, notify_red_cards")
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (isMounted.current) {
        if (data) {
          setSettings({
            notifyGoals: data.notify_goals,
            notifyRedCards: data.notify_red_cards,
          });
        } else {
          setSettings({ notifyGoals: false, notifyRedCards: false });
        }
      }
    } catch (error) {
      console.error("Error fetching alert settings:", error);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  const checkAuthAndFetch = useCallback(async (matchId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!isMounted.current) return;
    
    if (!user) {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
      fetchAlertSettings(matchId);
    }
  }, [fetchAlertSettings]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    
    if (match) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      
      // Only fetch once per modal open
      if (!hasFetched.current) {
        hasFetched.current = true;
        checkAuthAndFetch(match.id);
      }
    }
    return () => {
      isMounted.current = false;
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [match, handleEscape, checkAuthAndFetch]);

  const handleSave = async () => {
    if (!match) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to set match alerts.",
        });
        onClose();
        navigate("/login");
        return;
      }

      const hasAnyAlert = settings.notifyGoals || settings.notifyRedCards;

      if (hasAnyAlert) {
        // Upsert alert settings
        const { error } = await supabase
          .from("match_alerts")
          .upsert({
            user_id: user.id,
            match_id: match.id,
            notify_goals: settings.notifyGoals,
            notify_red_cards: settings.notifyRedCards,
          }, {
            onConflict: "user_id,match_id",
          });

        if (error) throw error;

        toast({
          title: "Alerts saved",
          description: `You'll be notified about ${match.homeTeam} vs ${match.awayTeam}`,
        });
      } else {
        // Remove alert if no options selected
        const { error } = await supabase
          .from("match_alerts")
          .delete()
          .eq("user_id", user.id)
          .eq("match_id", match.id);

        if (error) throw error;

        toast({
          title: "Alerts removed",
          description: "Match notifications have been disabled.",
        });
      }

      onClose();
    } catch (error) {
      console.error("Error saving alert settings:", error);
      toast({
        title: "Error",
        description: "Failed to save alert settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!match) return null;

  const hasActiveAlerts = settings.notifyGoals || settings.notifyRedCards;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-2xl pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {hasActiveAlerts ? (
                <BellRing className="h-5 w-5 text-primary" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-semibold text-foreground">Match Alerts</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Get notified for <span className="text-foreground font-medium">{match.homeTeam}</span> vs{" "}
              <span className="text-foreground font-medium">{match.awayTeam}</span>
            </div>

            {isAuthenticated === false ? (
              <div className="text-center py-6 space-y-4">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <p className="text-foreground font-medium">Sign in required</p>
                  <p className="text-sm text-muted-foreground">
                    Please sign in to set up match alerts
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    onClose();
                    navigate("/login");
                  }}
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    settings.notifyGoals
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setSettings((s) => ({ ...s, notifyGoals: !s.notifyGoals }))}
                >
                  <Checkbox
                    id="goals"
                    checked={settings.notifyGoals}
                    onCheckedChange={(checked) =>
                      setSettings((s) => ({ ...s, notifyGoals: !!checked }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Goal className="h-4 w-4 text-primary" />
                    <Label htmlFor="goals" className="cursor-pointer flex-1">
                      Notify me about goals
                    </Label>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    settings.notifyRedCards
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setSettings((s) => ({ ...s, notifyRedCards: !s.notifyRedCards }))}
                >
                  <Checkbox
                    id="redCards"
                    checked={settings.notifyRedCards}
                    onCheckedChange={(checked) =>
                      setSettings((s) => ({ ...s, notifyRedCards: !!checked }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Label htmlFor="redCards" className="cursor-pointer flex-1">
                      Notify me about red cards
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - only show for authenticated users */}
          {isAuthenticated && (
            <div className="flex gap-2 p-4 border-t border-border bg-muted/20">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={isLoading || isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Alerts"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
