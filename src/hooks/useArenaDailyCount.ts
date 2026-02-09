import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Counts how many arena predictions the user has made today.
 */
export function useArenaDailyCount(seasonId: string | null) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !seasonId) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];

    (supabase as any)
      .from("arena_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("season_id", seasonId)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59.999`)
      .then(({ count: c }: any) => {
        setCount(c ?? 0);
        setLoading(false);
      });
  }, [user, seasonId]);

  const increment = () => setCount((prev) => prev + 1);

  return { dailyCount: count, loading, increment };
}
