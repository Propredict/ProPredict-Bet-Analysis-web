import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPrediction {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchTime: string;

  // AI (blur)
  predictedOutcome: string;
  predictedScore: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  keyFactors: string[];
  analysis: string;

  isLocked: boolean;
}

type DayTab = "today" | "tomorrow";

export function useAIPredictions() {
  const [allPredictions, setAllPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayTab, setDayTab] = useState<DayTab>("today");

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .order("match_date", { ascending: true });

      if (!error && data) {
        setAllPredictions(
          data.map((m) => ({
            id: m.id,
            league: m.league,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            matchDate: m.match_date,
            matchTime: m.match_time,

            predictedOutcome: m.predicted_outcome ?? "1",
            predictedScore: m.predicted_score ?? "2-1",
            confidence: m.confidence ?? 65,
            riskLevel: m.risk_level ?? "medium",
            keyFactors: m.key_factors ?? [],
            analysis: m.analysis ?? "",

            isLocked: true,
          })),
        );
      }

      setLoading(false);
    };

    fetchPredictions();
  }, []);

  const unlockPrediction = (id: string) => {
    setAllPredictions((prev) => prev.map((p) => (p.id === id ? { ...p, isLocked: false } : p)));
  };

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const predictions = allPredictions.filter((p) =>
    dayTab === "today" ? p.matchDate === today : p.matchDate === tomorrow,
  );

  return {
    predictions,
    loading,
    dayTab,
    setDayTab,
    unlockPrediction,
  };
}
