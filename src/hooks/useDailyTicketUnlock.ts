import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const SURE_ODDS_PRODUCT_ID = "sure_odds_2plus_daily";
export const SURE_ODDS_PRICE_LABEL = "€3.99";

/** Today's date (YYYY-MM-DD) in Europe/Belgrade */
export function belgradeToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

/**
 * Checks whether the signed-in user has purchased today's Sure Odds 2+ ticket.
 * Premium access is handled separately by useUserPlan.
 */
export function useDailyTicketUnlock() {
  const { user } = useAuth();
  const [hasTodayUnlock, setHasTodayUnlock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnlock = useCallback(async () => {
    if (!user?.id) {
      setHasTodayUnlock(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("daily_ticket_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("unlock_date", belgradeToday())
      .maybeSingle();

    if (error) {
      console.error("[useDailyTicketUnlock] fetch failed", error.message);
    }
    setHasTodayUnlock(!!data);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchUnlock();
  }, [fetchUnlock]);

  return { hasTodayUnlock, isLoading, refetch: fetchUnlock };
}
