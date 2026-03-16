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

      // Za prikaz bodova: ako aktivna sezona nema nijednu korisničku predikciju, prikaži poslednju sezonu sa aktivnošću
      let seasonIdForDisplay = seasonIdForActions;
      if (activeSeasonId) {
        const { count: activePredictionCount } = await (supabase as any)
          .from("arena_predictions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("season_id", activeSeasonId);

        if ((activePredictionCount ?? 0) === 0 && latestUserSeasonId) {
          seasonIdForDisplay = latestUserSeasonId;
        }
      }

      const [predictionsResult, statsResult] = await Promise.all([
        (supabase as any)
          .from("arena_predictions")
          .select("status")
          .eq("user_id", user.id)
          .eq("season_id", seasonIdForDisplay),
        (supabase as any)
          .from("arena_user_stats")
          .select("current_streak, reward_granted")
          .eq("user_id", user.id)
          .eq("season_id", seasonIdForDisplay)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      const predictions = predictionsResult.data || [];
      const wins = predictions.filter((p: any) => isWin(p.status)).length;
      const losses = predictions.filter((p: any) => isLoss(p.status)).length;

      setStats({
        points: wins,
        wins,
        losses,
        currentStreak: statsResult.data?.current_streak ?? 0,
        rewardGranted: statsResult.data?.reward_granted ?? false,
        seasonId: seasonIdForActions,
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
