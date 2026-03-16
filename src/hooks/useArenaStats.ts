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

async function resolveSeasonId(userId: string): Promise<string | null> {
  const { data: activeSeasons } = await (supabase as any)
    .from("active_arena_season")
    .select("id, starts_at")
    .order("starts_at", { ascending: false })
    .limit(1);

  const activeSeasonId = activeSeasons?.[0]?.id ?? null;
  if (activeSeasonId) return activeSeasonId;

  // Fallback: korisnikova poslednja sezona iz realnih predikcija
  const { data: lastUserPrediction } = await (supabase as any)
    .from("arena_predictions")
    .select("season_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastUserPrediction?.season_id) return lastUserPrediction.season_id;

  // Final fallback: najnovija definisana sezona
  const { data: latestSeason } = await (supabase as any)
    .from("arena_seasons")
    .select("id, starts_at")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latestSeason?.id ?? null;
}

export function useArenaStats(): ArenaStats {
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const [stats, setStats] = useState<ArenaStats>({
    points: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    rewardGranted: false,
    seasonId: null,
    loading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }

    try {
      await (supabase as any).rpc("ensure_arena_user_stats");

      const seasonId = await resolveSeasonId(user.id);

      if (!mountedRef.current) return;

      if (!seasonId) {
        setStats((s) => ({ ...s, loading: false }));
        return;
      }

      const [predictionsResult, statsResult] = await Promise.all([
        (supabase as any)
          .from("arena_predictions")
          .select("status")
          .eq("user_id", user.id)
          .eq("season_id", seasonId),
        (supabase as any)
          .from("arena_user_stats")
          .select("current_streak, reward_granted")
          .eq("user_id", user.id)
          .eq("season_id", seasonId)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      const predictions = predictionsResult.data || [];
      const wins = predictions.filter((p: any) => p.status === "won" || p.status === "win").length;
      const losses = predictions.filter((p: any) => p.status === "lost" || p.status === "loss").length;

      setStats({
        points: wins,
        wins,
        losses,
        currentStreak: statsResult.data?.current_streak ?? 0,
        rewardGranted: statsResult.data?.reward_granted ?? false,
        seasonId,
        loading: false,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Arena stats error:", err);
      setStats((s) => ({ ...s, loading: false }));
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
