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
  seasonName: string | null;
  loading: boolean;
}

const REFRESH_INTERVAL = 60_000;

const isWin = (status: string) => status === "won" || status === "win";
const isLoss = (status: string) => status === "lost" || status === "loss";

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
    seasonName: null,
    loading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }

    try {
      await (supabase as any).rpc("ensure_arena_user_stats");

      const [activeSeasonsRes, lastUserPredictionRes, latestSeasonRes] = await Promise.all([
        (supabase as any)
          .from("active_arena_season")
          .select("id, starts_at, season_key")
          .order("starts_at", { ascending: false })
          .limit(1),
        (supabase as any)
          .from("arena_predictions")
          .select("season_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from("arena_seasons")
          .select("id, starts_at, season_key")
          .order("starts_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      const activeSeasonId = activeSeasonsRes.data?.[0]?.id ?? null;
      const latestUserSeasonId = lastUserPredictionRes.data?.season_id ?? null;
      const latestSeasonId = latestSeasonRes.data?.id ?? null;

      // seasonId koristi se i za submit flow (AIvsCommunity), zato prioritetno držimo aktivnu sezonu
      const seasonIdForActions = activeSeasonId ?? latestUserSeasonId ?? latestSeasonId;
      if (!seasonIdForActions) {
        setStats((s) => ({ ...s, loading: false }));
        return;
      }

      // Use cumulative stats across all seasons (points reset only after reaching 1000)
      const seasonIdForDisplay = activeSeasonId ?? seasonIdForActions;

      // Fetch ALL user stats (cumulative across seasons) + recent predictions for streak
      const [allStatsResult, recentPredictionsResult] = await Promise.all([
        (supabase as any)
          .from("arena_user_stats")
          .select("points, wins, losses, current_streak, reward_granted")
          .eq("user_id", user.id),
        (supabase as any)
          .from("arena_predictions")
          .select("status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!mountedRef.current) return;

      // Sum points/wins/losses across ALL seasons (cumulative until 1000 reset)
      const allStats = allStatsResult.data || [];
      const totalPoints = allStats.reduce((sum: number, s: any) => sum + (s.points ?? 0), 0);
      const totalWins = allStats.reduce((sum: number, s: any) => sum + (s.wins ?? 0), 0);
      const totalLosses = allStats.reduce((sum: number, s: any) => sum + (s.losses ?? 0), 0);
      const rewardGranted = allStats.some((s: any) => s.reward_granted);

      // Derive streak from recent predictions (across all time)
      const recentPredictions = recentPredictionsResult.data || [];
      let derivedStreak = 0;
      for (const p of recentPredictions) {
        if (p.status === "pending") continue;
        if (isWin(p.status)) {
          derivedStreak++;
          continue;
        }
        if (isLoss(p.status)) break;
      }
      // Use higher of derived vs any single season server streak
      const maxServerStreak = allStats.reduce((max: number, s: any) => Math.max(max, s.current_streak ?? 0), 0);
      const currentStreak = Math.max(derivedStreak, maxServerStreak);

      setStats({
        points: totalPoints,
        wins: totalWins,
        losses: totalLosses,
        currentStreak,
        rewardGranted,
        seasonId: seasonIdForActions,
        seasonName: null,
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
