import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MatchAlert {
  match_id: string;
  notify_goals: boolean;
  notify_red_cards: boolean;
}

export function useMatchAlerts() {
  const [alerts, setAlerts] = useState<Map<string, MatchAlert>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMounted.current) {
          setAlerts(new Map());
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("match_alerts")
        .select("match_id, notify_goals, notify_red_cards")
        .eq("user_id", user.id);

      if (error) throw error;

      if (isMounted.current) {
        const alertsMap = new Map<string, MatchAlert>();
        (data as MatchAlert[] | null)?.forEach((alert) => {
          alertsMap.set(alert.match_id, alert);
        });
        setAlerts(alertsMap);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAlerts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAlerts();
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchAlerts]);

  const hasAlert = useCallback((matchId: string) => {
    const alert = alerts.get(matchId);
    return alert ? (alert.notify_goals || alert.notify_red_cards) : false;
  }, [alerts]);

  const refetch = useCallback(() => fetchAlerts(), [fetchAlerts]);

  return { alerts, hasAlert, isLoading, refetch };
}
