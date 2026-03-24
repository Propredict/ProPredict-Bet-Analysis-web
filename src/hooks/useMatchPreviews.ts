import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchPreview {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  match_date: string | null;
  match_time: string | null;
  preview_analysis: string | null;
  home_form: string | null;
  away_form: string | null;
  h2h_summary: string | null;
  tactical_notes: string | null;
  key_stats: {
    key_factors?: string[];
    home_win?: number;
    draw?: number;
    away_win?: number;
    last_home_goals?: number;
    last_away_goals?: number;
  } | null;
  confidence_score: number;
  risk_rating: string | null;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  predicted_score: string | null;
  rank: number | null;
  created_at: string | null;
  updated_at: string | null;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function fetchMatchPreviews(): Promise<MatchPreview[]> {
  const todayStr = getTodayStr();

  // Use .select() with explicit cast since table may not be in generated types yet
  const { data, error } = await (supabase as any)
    .from("match_previews")
    .select("*")
    .eq("match_date", todayStr)
    .order("rank", { ascending: true });

  if (error) {
    console.error("Error fetching match previews:", error);
    return [];
  }

  return (data as MatchPreview[]) ?? [];
}

export function useMatchPreviews() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["match-previews", getTodayStr()],
    queryFn: fetchMatchPreviews,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    previews: data ?? [],
    loading: isLoading,
    refetch,
  };
}
