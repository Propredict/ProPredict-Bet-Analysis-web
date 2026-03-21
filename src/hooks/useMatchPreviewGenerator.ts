import { useState, useCallback } from "react";
import type { Match } from "@/hooks/useFixtures";
import type { MatchAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { supabase } from "@/integrations/supabase/client";

/**
 * Build a consistent analysis from the real AI prediction row
 * stored in the ai_predictions table — no random numbers.
 */
function buildAnalysisFromPrediction(
  match: Match,
  row: {
    prediction: string | null;
    confidence: number | null;
    analysis: string | null;
    key_factors: string[] | null;
    home_win: number | null;
    draw: number | null;
    away_win: number | null;
    predicted_score: string | null;
    risk_level: string | null;
    last_home_goals: number | null;
    last_away_goals: number | null;
  }
): MatchAnalysis {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const confidence = row.confidence ?? 60;
  const prediction = (row.prediction || "").toLowerCase().trim();

  // Determine outcome label
  let outcome: string;
  if (prediction === "1" || prediction === "home") outcome = `${homeTeam} to win`;
  else if (prediction === "2" || prediction === "away") outcome = `${awayTeam} to win`;
  else if (prediction === "x" || prediction === "draw") outcome = "Draw likely";
  else if (prediction.includes("over")) outcome = "Over 2.5 Goals";
  else if (prediction.includes("under")) outcome = "Under 2.5 Goals";
  else if (prediction.includes("btts")) outcome = "Both Teams to Score";
  else outcome = row.prediction || "Analysis pending";

  // Overview from AI analysis or generate meaningful one
  const overview =
    row.analysis ||
    `${homeTeam} faces ${awayTeam} in a ${match.league} fixture. Based on our AI model's analysis with ${confidence}% confidence, this match presents an interesting tactical battle.`;

  // Reasoning
  const reasoning =
    row.key_factors && row.key_factors.length > 0
      ? row.key_factors.join(". ") + "."
      : `Our AI engine has analyzed team form, head-to-head records, and current standings to arrive at this prediction with ${confidence}% confidence.`;

  // Key stats from real data
  const homeGoals = row.last_home_goals ?? 0;
  const awayGoals = row.last_away_goals ?? 0;
  const homeWinProb = row.home_win ?? 0;
  const drawProb = row.draw ?? 0;
  const awayWinProb = row.away_win ?? 0;

  const keyStats = [
    {
      label: `${homeTeam} Win Probability`,
      value: `${homeWinProb}%`,
      trend: (homeWinProb >= 50 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: `${awayTeam} Win Probability`,
      value: `${awayWinProb}%`,
      trend: (awayWinProb >= 50 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: "Draw Probability",
      value: `${drawProb}%`,
      trend: "neutral" as const,
    },
    {
      label: "Risk Level",
      value: row.risk_level || "Medium",
      trend: (row.risk_level === "Low" ? "positive" : row.risk_level === "High" ? "negative" : "neutral") as "positive" | "negative" | "neutral",
    },
    {
      label: `${homeTeam} Recent Goals`,
      value: `${homeGoals} avg`,
      trend: (homeGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: `${awayTeam} Recent Goals`,
      value: `${awayGoals} avg`,
      trend: (awayGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
  ];

  // Insights from key_factors or fallback
  const insights =
    row.key_factors && row.key_factors.length > 0
      ? row.key_factors
      : [
          `AI model confidence: ${confidence}%`,
          `Home win probability: ${homeWinProb}%`,
          `Away win probability: ${awayWinProb}%`,
          `Predicted risk level: ${row.risk_level || "Medium"}`,
        ];

  return {
    overview,
    keyStats,
    insights,
    prediction: {
      outcome,
      confidence,
      reasoning,
    },
  };
}

export function useMatchPreviewGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [generatedMatch, setGeneratedMatch] = useState<Match | null>(null);

  const generate = useCallback(async (match: Match) => {
    setIsGenerating(true);
    setAnalysis(null);
    setGeneratedMatch(match);

    try {
      // Fetch real prediction from ai_predictions table
      const { data, error } = await supabase
        .from("ai_predictions")
        .select("prediction, confidence, analysis, key_factors, home_win, draw, away_win, predicted_score, risk_level, last_home_goals, last_away_goals")
        .eq("match_id", match.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching AI prediction:", error);
      }

      if (data) {
        const result = buildAnalysisFromPrediction(match, data);
        setAnalysis(result);
        return result;
      }

      // Fallback: try matching by team names if match_id didn't work
      const { data: fallbackData } = await supabase
        .from("ai_predictions")
        .select("prediction, confidence, analysis, key_factors, home_win, draw, away_win, predicted_score, risk_level, last_home_goals, last_away_goals")
        .eq("home_team", match.homeTeam)
        .eq("away_team", match.awayTeam)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackData) {
        const result = buildAnalysisFromPrediction(match, fallbackData);
        setAnalysis(result);
        return result;
      }

      // No data found — show message
      const noDataAnalysis: MatchAnalysis = {
        overview: `No AI prediction data available yet for ${match.homeTeam} vs ${match.awayTeam}. Check back closer to match time.`,
        keyStats: [],
        insights: ["AI prediction data will be available when the model processes this match."],
        prediction: {
          outcome: "Pending",
          confidence: 0,
          reasoning: "This match has not yet been analyzed by our AI engine.",
        },
      };
      setAnalysis(noDataAnalysis);
      return noDataAnalysis;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setGeneratedMatch(null);
  }, []);

  return {
    isGenerating,
    analysis,
    generatedMatch,
    generate,
    reset,
  };
}
