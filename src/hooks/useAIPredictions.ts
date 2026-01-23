import { useEffect, useState } from "react";
import type { AIPrediction } from "@/components/ai-predictions/types";

const normalizeOutcome = (v: string): "1" | "X" | "2" => {
  if (v === "1" || v === "2" || v === "X") return v;
  return "1";
};

export function useAIPredictions() {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // ⛔ privremeno FAKE AI DATA (dok ne spojimo pravi AI)
    const data: AIPrediction[] = [
      {
        id: "1",
        matchId: "m1",
        league: "Premier League",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        matchDate: "Today",
        matchTime: "20:00",

        predictedOutcome: "1",
        predictedScore: "2-1",
        confidence: 72,

        homeWinProbability: 52,
        drawProbability: 26,
        awayWinProbability: 22,

        riskLevel: "medium",
        isLive: false,
        isPremium: false,
        isLocked: false, // 👈 TI SI UNLOCKED

        analysis: "Arsenal shows stronger home form and higher xG.",
        keyFactors: ["Home advantage", "Recent form"],
      },
      {
        id: "2",
        matchId: "m2",
        league: "La Liga",
        homeTeam: "Barcelona",
        awayTeam: "Sevilla",
        matchDate: "Tomorrow",
        matchTime: "21:00",

        predictedOutcome: "1",
        predictedScore: "3-1",
        confidence: 78,

        homeWinProbability: 60,
        drawProbability: 22,
        awayWinProbability: 18,

        riskLevel: "low",
        isLive: false,
        isPremium: false,
        isLocked: false,

        analysis: "Barcelona dominates possession and chances at home.",
        keyFactors: ["Squad quality", "Home dominance"],
      },
    ].map((p) => ({
      ...p,
      predictedOutcome: normalizeOutcome(p.predictedOutcome),
    }));

    setPredictions(data);
    setLoading(false);
  }, []);

  return { predictions, loading };
}
