import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Counts how many arena predictions the user has made today.
 */
export function useArenaDailyCount(seasonId: string | null) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user || !seasonId) { setLoading(false); return; }

    const now = new Date();
    const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    (supabase as any)
      .from("arena_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("season_id", seasonId)
      .gte("created_at", localStart.toISOString())
      .lte("created_at", localEnd.toISOString())
      .then(({ count: c }: any) => {
        if (!mountedRef.current) return;
        setCount(c ?? 0);
        setLoading(false);
      })
      .catch(() => {});

    return () => { mountedRef.current = false; };
  }, [user, seasonId]);

  const increment = () => setCount((prev) => prev + 1);

  return { dailyCount: count, loading, increment };
}
