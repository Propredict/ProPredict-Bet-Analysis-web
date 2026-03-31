import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STREAK_POINTS = [0, 2, 3, 4, 5, 6, 8, 15]; // index = day

export interface DailyRewardState {
  claimedToday: boolean;
  currentStreak: number;
  totalPoints: number;
  loading: boolean;
  claiming: boolean;
  lastClaimResult: { streakDay: number; pointsEarned: number } | null;
}

export function useDailyReward() {
  const { user } = useAuth();
  const [state, setState] = useState<DailyRewardState>({
    claimedToday: false,
    currentStreak: 0,
    totalPoints: 0,
    loading: true,
    claiming: false,
    lastClaimResult: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc("get_daily_reward_status");
      if (error) throw error;

      setState(s => ({
        ...s,
        claimedToday: data?.claimed_today ?? false,
        currentStreak: data?.current_streak ?? 0,
        totalPoints: data?.total_points ?? 0,
        loading: false,
      }));
    } catch (err) {
      console.error("Daily reward status error:", err);
      setState(s => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const claim = useCallback(async () => {
    if (!user || state.claiming || state.claimedToday) return;

    setState(s => ({ ...s, claiming: true }));

    try {
      const { data, error } = await (supabase as any).rpc("claim_daily_reward");
      if (error) throw error;

      if (data?.success) {
        setState(s => ({
          ...s,
          claimedToday: true,
          currentStreak: data.streak_day,
          totalPoints: s.totalPoints + data.points_earned,
          claiming: false,
          lastClaimResult: {
            streakDay: data.streak_day,
            pointsEarned: data.points_earned,
          },
        }));
      } else {
        setState(s => ({ ...s, claiming: false }));
      }
    } catch (err) {
      console.error("Claim daily reward error:", err);
      setState(s => ({ ...s, claiming: false }));
    }
  }, [user, state.claiming, state.claimedToday]);

  const dismissClaimResult = useCallback(() => {
    setState(s => ({ ...s, lastClaimResult: null }));
  }, []);

  const nextDayPoints = STREAK_POINTS[Math.min((state.currentStreak % 7) + 1, 7)] ?? 2;

  return {
    ...state,
    claim,
    dismissClaimResult,
    nextDayPoints,
    streakPoints: STREAK_POINTS,
  };
}
