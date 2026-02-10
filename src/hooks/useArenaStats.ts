import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ArenaStats {
  points: number;
  wins: number;
  losses: number;
  currentStreak: number;
  rewardGranted: boolean;
  seasonId: string | null;
  loading: boolean;
}

const REFRESH_INTERVAL = 60_000;

export function useArenaStats(): ArenaStats {
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [stats, setStats] = useState<ArenaStats>({
    points: 0, wins: 0, losses: 0, currentStreak: 0,
    rewardGranted: false, seasonId: null, loading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    try {
      await (supabase as any).rpc("ensure_arena_user_stats");

      const { data: season } = await (supabase as any)
        .from("active_arena_season")
        .select("id")
        .maybeSingle();

      if (!mountedRef.current) return;

      if (!season?.id) {
        setStats(s => ({ ...s, loading: false }));
        return;
      }

      // Derive stats directly from arena_predictions for consistency
      const [predictionsResult, statsResult] = await Promise.all([
        (supabase as any)
          .from("arena_predictions")
          .select("status")
          .eq("user_id", user.id)
          .eq("season_id", season.id),
        (supabase as any)
          .from("arena_user_stats")
          .select("current_streak, reward_granted")
          .eq("user_id", user.id)
          .eq("season_id", season.id)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      const predictions = predictionsResult.data || [];
      const wins = predictions.filter((p: any) => p.status === "won" || p.status === "win").length;
      const losses = predictions.filter((p: any) => p.status === "lost" || p.status === "loss").length;

      setStats({
        points: wins, // 1 point per win, derived from actual predictions
        wins,
        losses,
        currentStreak: statsResult.data?.current_streak ?? 0,
        rewardGranted: statsResult.data?.reward_granted ?? false,
        seasonId: season.id,
        loading: false,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Arena stats error:", err);
      setStats(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStats]);

  return stats;
}
