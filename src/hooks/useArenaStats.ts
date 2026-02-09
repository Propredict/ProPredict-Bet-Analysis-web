import { useEffect, useState } from "react";
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

export function useArenaStats(): ArenaStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<ArenaStats>({
    points: 0, wins: 0, losses: 0, currentStreak: 0,
    rewardGranted: false, seasonId: null, loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    const init = async () => {
      try {
        // Ensure user stats row exists for active season
        await (supabase as any).rpc("ensure_arena_user_stats");

        // Fetch active season
        const { data: season } = await (supabase as any)
          .from("active_arena_season")
          .select("id")
          .maybeSingle();

        if (!season?.id) {
          setStats(s => ({ ...s, loading: false }));
          return;
        }

        // Fetch user stats for this season
        const { data } = await (supabase as any)
          .from("arena_user_stats")
          .select("points, wins, losses, current_streak, reward_granted")
          .eq("user_id", user.id)
          .eq("season_id", season.id)
          .maybeSingle();

        setStats({
          points: data?.points ?? 0,
          wins: data?.wins ?? 0,
          losses: data?.losses ?? 0,
          currentStreak: data?.current_streak ?? 0,
          rewardGranted: data?.reward_granted ?? false,
          seasonId: season.id,
          loading: false,
        });
      } catch (err) {
        console.error("Arena stats error:", err);
        setStats(s => ({ ...s, loading: false }));
      }
    };

    init();
  }, [user]);

  return stats;
}
