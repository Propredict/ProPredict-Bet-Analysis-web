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

      // Uvek prikazuj aktivnu sezonu (čak i ako korisnik nema predikcije — prikaži 0)
      const seasonIdForDisplay = activeSeasonId ?? seasonIdForActions;

      const [seasonPredictionsResult, allPredictionsResult, statsResult, seasonResult] = await Promise.all([
        (supabase as any)
          .from("arena_predictions")
          .select("status, created_at")
          .eq("user_id", user.id)
          .eq("season_id", seasonIdForDisplay)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("arena_predictions")
          .select("status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        (supabase as any)
          .from("arena_user_stats")
          .select("points, wins, losses, current_streak, reward_granted")
          .eq("user_id", user.id)
          .eq("season_id", seasonIdForDisplay)
          .maybeSingle(),
        (supabase as any)
          .from("arena_seasons")
          .select("season_key")
          .eq("id", seasonIdForDisplay)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      const seasonPredictions = seasonPredictionsResult.data || [];
      const allPredictions = allPredictionsResult.data || [];

      const seasonWins = seasonPredictions.filter((p: any) => isWin(p.status)).length;
      const seasonLosses = seasonPredictions.filter((p: any) => isLoss(p.status)).length;
      const seasonHasResolved = seasonWins + seasonLosses > 0;

      const allWins = allPredictions.filter((p: any) => isWin(p.status)).length;
      const allLosses = allPredictions.filter((p: any) => isLoss(p.status)).length;

      // Prefer current season when it has resolved results; otherwise fallback to all-time resolved results
      const effectiveWinsFromPredictions = seasonHasResolved ? seasonWins : allWins;
      const effectiveLossesFromPredictions = seasonHasResolved ? seasonLosses : allLosses;

      const serverStats = statsResult.data;
      const wins = effectiveWinsFromPredictions > 0 ? effectiveWinsFromPredictions : (serverStats?.wins ?? 0);
      const losses = effectiveLossesFromPredictions > 0 ? effectiveLossesFromPredictions : (serverStats?.losses ?? 0);
      const points = effectiveWinsFromPredictions > 0 ? effectiveWinsFromPredictions : (serverStats?.points ?? 0);

      // Derive human-readable season name from display season_key (e.g. "2026-03" → "March 2026")
      const rawKey = seasonResult.data?.season_key ?? null;
      let seasonName: string | null = null;
      if (rawKey) {
        const [y, m] = rawKey.split("-");
        const date = new Date(+y, +m - 1);
        seasonName = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      }

      // Derive current streak from effective predictions set (season first, then all-time fallback)
      const streakSource = seasonHasResolved ? seasonPredictions : allPredictions;
      let derivedStreak = 0;
      for (const p of streakSource) {
        if (p.status === "pending") continue;
        if (isWin(p.status)) {
          derivedStreak++;
          continue;
        }
        if (isLoss(p.status)) break;
      }
      const currentStreak = derivedStreak > 0 ? derivedStreak : (serverStats?.current_streak ?? 0);

      setStats({
        points,
        wins,
        losses,
        currentStreak,
        rewardGranted: serverStats?.reward_granted ?? false,
        seasonId: seasonIdForActions,
        seasonName,
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
