import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/hooks/useLiveScores";

interface AIPrediction {
  home_team: string;
  away_team: string;
  prediction: string; // "1" | "X" | "2"
  match_id: string;
}

type AIStatus = "on_track" | "under_pressure" | null;

export function useAILiveStatus() {
  // Fetch today's AI predictions
  const { data: predictions = [] } = useQuery({
    queryKey: ["ai-predictions-live-status"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from as any)("ai_predictions_public")
        .select("home_team, away_team, prediction, match_id")
        .eq("match_day", "today");

      if (error) throw error;
      return (data ?? []) as AIPrediction[];
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
  });

  // Create a lookup map by normalized team names
  const predictionMap = useMemo(() => {
    const map = new Map<string, AIPrediction>();
    predictions.forEach((p) => {
      const key = normalizeKey(p.home_team, p.away_team);
      map.set(key, p);
    });
    return map;
  }, [predictions]);

  // Get AI status for a live match
  const getAIStatus = (match: Match): AIStatus => {
    // Only show for live/halftime matches
    if (match.status !== "live" && match.status !== "halftime") {
      return null;
    }

    const key = normalizeKey(match.homeTeam, match.awayTeam);
    const prediction = predictionMap.get(key);

    if (!prediction) return null;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    // Determine status based on prediction vs actual score
    switch (prediction.prediction) {
      case "1": // Home win predicted
        if (homeScore > awayScore) return "on_track";
        if (homeScore < awayScore) return "under_pressure";
        return "under_pressure"; // Draw when home win predicted = pressure
        
      case "2": // Away win predicted
        if (awayScore > homeScore) return "on_track";
        if (awayScore < homeScore) return "under_pressure";
        return "under_pressure"; // Draw when away win predicted = pressure
        
      case "X": // Draw predicted
        if (homeScore === awayScore) return "on_track";
        return "under_pressure";
        
      default:
        return null;
    }
  };

  // Check if match has AI prediction
  const hasAIPrediction = (match: Match): boolean => {
    const key = normalizeKey(match.homeTeam, match.awayTeam);
    return predictionMap.has(key);
  };

  return { getAIStatus, hasAIPrediction };
}

// Normalize team names for matching
function normalizeKey(home: string, away: string): string {
  return `${home.toLowerCase().trim()}|${away.toLowerCase().trim()}`;
}
