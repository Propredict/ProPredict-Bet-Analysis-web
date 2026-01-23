import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPrediction {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchTime: string;
  prediction: string;
  score: string;
  confidence: number;
  risk: "Low" | "Medium" | "High";
  isLocked: boolean;
}

type DayTab = "today" | "tomorrow";

export const useAIPredictions = () => {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayTab, setDayTab] = useState<DayTab>("today");
  const [selectedLeague, setSelectedLeague] = useState("all");

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .order("match_time", { ascending: true });

      if (!error && data) {
        setPredictions(
          data.map((m) => ({
            id: m.id,
            league: m.league,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            matchDate: m.match_date,
            matchTime: m.match_time,
            prediction: "1",
            score: "2-1",
            confidence: Math.floor(45 + Math.random() * 35),
            risk: "Medium",
            isLocked: true,
          })),
        );
      }

      setLoading(false);
    };

    fetchPredictions();
  }, []);

  const unlockPrediction = (id: string) => {
    setPredictions((prev) => prev.map((p) => (p.id === id ? { ...p, isLocked: false } : p)));
  };

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const filteredByDay = predictions.filter((p) =>
    dayTab === "today" ? p.matchDate === today : p.matchDate === tomorrow,
  );

  const filtered = filteredByDay.filter((p) => (selectedLeague === "all" ? true : p.league === selectedLeague));

  return {
    predictions: filtered,
    loading,
    dayTab,
    setDayTab,
    selectedLeague,
    setSelectedLeague,
    unlockPrediction,
  };
};
