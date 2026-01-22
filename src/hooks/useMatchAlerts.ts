import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MatchAlert {
  match_id: string;
  notify_goals: boolean;
  notify_red_cards: boolean;
}

export function useMatchAlerts() {
  const [alerts, setAlerts] = useState<Map<string, MatchAlert>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAlerts();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlerts(new Map());
        setIsLoading(false);
        return;
      }

      // Using type assertion since match_alerts table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("match_alerts")
        .select("match_id, notify_goals, notify_red_cards")
        .eq("user_id", user.id);

      if (error) throw error;

      const alertsMap = new Map<string, MatchAlert>();
      (data as MatchAlert[] | null)?.forEach((alert) => {
        alertsMap.set(alert.match_id, alert);
      });

      setAlerts(alertsMap);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAlert = (matchId: string) => {
    const alert = alerts.get(matchId);
    return alert ? (alert.notify_goals || alert.notify_red_cards) : false;
  };

  const refetch = () => fetchAlerts();

  return { alerts, hasAlert, isLoading, refetch };
}
