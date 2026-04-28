import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChampionLeaderboardRow {
  team_name: string;
  team_code: string | null;
  team_flag: string | null;
  votes: number;
  percentage: number;
}

export interface MyChampionPick {
  has_vote: boolean;
  team_name?: string | null;
  team_code?: string | null;
  team_flag?: string | null;
  is_correct?: boolean | null;
  reward_granted?: boolean;
  reward_tier?: string | null;
  deadline: string;
  status: "open" | "closed" | "resolved";
  winner_team?: string | null;
}

export function useChampionPrediction() {
  const [myPick, setMyPick] = useState<MyChampionPick | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChampionLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [pickRes, lbRes] = await Promise.all([
      supabase.rpc("get_my_champion_prediction"),
      supabase.rpc("get_champion_leaderboard"),
    ]);
    if (!pickRes.error && pickRes.data) setMyPick(pickRes.data as unknown as MyChampionPick);
    if (!lbRes.error && lbRes.data) setLeaderboard(lbRes.data as ChampionLeaderboardRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const castVote = useCallback(
    async (teamName: string, teamCode?: string, teamFlag?: string) => {
      setSubmitting(true);
      const { data, error } = await supabase.rpc("cast_champion_vote", {
        p_team_name: teamName,
        p_team_code: teamCode ?? null,
        p_team_flag: teamFlag ?? null,
      });
      setSubmitting(false);
      if (error) return { success: false, error: error.message };
      await refresh();
      return data as { success: boolean; updated?: boolean; team?: string; error?: string };
    },
    [refresh]
  );

  const totalVotes = leaderboard.reduce((s, r) => s + Number(r.votes), 0);
  const isLocked = myPick
    ? myPick.status !== "open" || new Date(myPick.deadline) < new Date()
    : false;

  return { myPick, leaderboard, loading, submitting, castVote, refresh, totalVotes, isLocked };
}
