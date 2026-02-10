import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AIPrediction {
  id: string;
  match_id: string;
  league: string | null;
  home_team: string;
  away_team: string;
  match_date: string;
  match_time: string;
  prediction: string;
  predicted_score: string | null;
  confidence: number;
  home_win: number;
  draw: number;
  away_win: number;
  risk_level: string | null;
  analysis: string | null;
  key_factors: string[] | null;
  is_premium: boolean | null;
  is_live: boolean | null;
  is_locked: boolean | null;
  result_status: string | null;
}

/**
 * Calculate date string for a given day offset, using UTC
 * to match the backend edge function which also uses UTC dates.
 */
function getDateString(dayOffset: number = 0): string {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
  return utcDate.toISOString().split("T")[0];
}

/**
 * Fetch predictions from Supabase for a specific date
 */
async function fetchPredictions(dateStr: string): Promise<AIPrediction[]> {
  const { data, error } = await (supabase
    .from as any)("ai_predictions_public")
    .select("*")
    .eq("match_date", dateStr)
    .order("match_time", { ascending: true });

  if (error) {
    console.error("Error fetching AI predictions:", error);
    return [];
  }

  return data ?? [];
}

/**
 * React Query hook for AI predictions with caching and prefetch.
 * - "today" → match_date = current date
 * - "tomorrow" → match_date = current date + 1 day
 * 
 * Optimizations:
 * - staleTime: 5 minutes (data stays fresh, no refetch)
 * - gcTime: 30 minutes (cache retention)
 * - refetchOnWindowFocus: false (better for Android WebView)
 * - Prefetches tomorrow's data when viewing today
 */
export function useAIPredictions(day: "today" | "tomorrow") {
  const queryClient = useQueryClient();
  const dayOffset = day === "tomorrow" ? 1 : 0;
  const dateStr = getDateString(dayOffset);

  // Prefetch tomorrow's data when viewing today
  useEffect(() => {
    if (day === "today") {
      const tomorrowDate = getDateString(1);
      queryClient.prefetchQuery({
        queryKey: ["ai-predictions", tomorrowDate],
        queryFn: () => fetchPredictions(tomorrowDate),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    }
  }, [day, queryClient]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ai-predictions", dateStr],
    queryFn: () => fetchPredictions(dateStr),
    staleTime: 0, // always consider stale so manual/server updates show immediately
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retention
    refetchOnWindowFocus: false, // Better for Android WebView
    refetchOnMount: "always", // ensure fresh data when returning to tab/page
  });

  return {
    predictions: data ?? [],
    loading: isLoading,
    refetch,
  };
}

/**
 * Prefetch both today and tomorrow predictions
 * Call this on app mount for instant navigation
 */
export function usePrefetchAIPredictions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const todayDate = getDateString(0);
    const tomorrowDate = getDateString(1);

    // Prefetch both days in parallel
    Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["ai-predictions", todayDate],
        queryFn: () => fetchPredictions(todayDate),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["ai-predictions", tomorrowDate],
        queryFn: () => fetchPredictions(tomorrowDate),
        staleTime: 5 * 60 * 1000,
      }),
    ]);
  }, [queryClient]);
}
