import { useState, useCallback } from "react";
import type { Match } from "@/hooks/useFixtures";
import type { MatchAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { supabase } from "@/integrations/supabase/client";

export interface MatchPreviewPredictionRow {
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

function extractGoalsFromAnalysis(text: string | null): { homeGoals: number; awayGoals: number; homeConc: number; awayConc: number } {
  if (!text) return { homeGoals: 0, awayGoals: 0, homeConc: 0, awayConc: 0 };
  let homeGoals = 0;
  let awayGoals = 0;
  let homeConc = 0;
  let awayConc = 0;

  const splitsSection = text.match(/HOME\/AWAY SPLITS.*?(?=📈|🛡️|🔥|$)/s);
  if (splitsSection) {
    const homeMatch = splitsSection[0].match(/at home.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (homeMatch) {
      homeGoals = parseFloat(homeMatch[1]);
      homeConc = parseFloat(homeMatch[2]);
    }

    const awayMatch = splitsSection[0].match(/away.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (awayMatch) {
      awayGoals = parseFloat(awayMatch[1]);
      awayConc = parseFloat(awayMatch[2]);
    }
  }

  if (!homeGoals || !awayGoals) {
    const seasonSection = text.match(/SEASON STATS.*?(?=🛡️|🔥|🚑|$)/s);
    if (seasonSection) {
      const avgMatches = seasonSection[0].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/gi);
      if (avgMatches?.[0]) {
        const m1 = avgMatches[0].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/i);
        if (m1 && !homeGoals) {
          homeGoals = parseFloat(m1[1]);
          homeConc = parseFloat(m1[2]);
        }
      }

      if (avgMatches?.[1]) {
        const m2 = avgMatches[1].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/i);
        if (m2 && !awayGoals) {
          awayGoals = parseFloat(m2[1]);
          awayConc = parseFloat(m2[2]);
        }
      }
    }
  }

  if (!homeGoals || !awayGoals) {
    const avgMatches = [...text.matchAll(/avg\s*([\d.]+)\s*\/\s*([\d.]+)/gi)];
    if (avgMatches[0] && !homeGoals) {
      homeGoals = parseFloat(avgMatches[0][1]);
      homeConc = parseFloat(avgMatches[0][2]);
    }

    if (avgMatches[1] && !awayGoals) {
      awayGoals = parseFloat(avgMatches[1][1]);
      awayConc = parseFloat(avgMatches[1][2]);
    }
  }

  return { homeGoals, awayGoals, homeConc, awayConc };
}

function extractFormFromAnalysis(text: string | null, teamIndex: 0 | 1): string | null {
  if (!text) return null;
  const formMatches = text.match(/([WDL]{5,})/g);
  if (formMatches?.[teamIndex]) return formMatches[teamIndex];
  return null;
}

function buildAnalysisFromPrediction(match: Match, row: MatchPreviewPredictionRow): MatchAnalysis {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const confidence = row.confidence ?? 60;
  const prediction = (row.prediction || "").toLowerCase().trim();
  const homeWin = row.home_win ?? 0;
  const awayWin = row.away_win ?? 0;
  const drawProb = row.draw ?? 0;

  const extracted = extractGoalsFromAnalysis(row.analysis);
  const homeGoals = row.last_home_goals && row.last_home_goals > 0 ? row.last_home_goals : extracted.homeGoals;
  const awayGoals = row.last_away_goals && row.last_away_goals > 0 ? row.last_away_goals : extracted.awayGoals;
  const hasGoalData = homeGoals > 0 && awayGoals > 0;
  const totalAvg = homeGoals + awayGoals;

  const homeForm = extractFormFromAnalysis(row.analysis, 0);
  const awayForm = extractFormFromAnalysis(row.analysis, 1);
  const homeFormWins = homeForm ? (homeForm.match(/W/g) || []).length : null;
  const awayFormWins = awayForm ? (awayForm.match(/W/g) || []).length : null;

  let outcome: string;
  if (prediction === "1" || prediction === "home") outcome = `${homeTeam} to win`;
  else if (prediction === "2" || prediction === "away") outcome = `${awayTeam} to win`;
  else if (prediction === "x" || prediction === "draw") outcome = "Draw likely";
  else if (prediction.includes("over")) outcome = "Over 2.5 Goals";
  else if (prediction.includes("under")) outcome = "Under 2.5 Goals";
  else if (prediction.includes("btts")) outcome = "Both Teams to Score";
  else outcome = row.prediction || "Analysis pending";

  let overview: string;
  const homeFormDesc = homeFormWins !== null ? ` with ${homeFormWins} wins in last ${homeForm.length} matches` : "";
  const awayFormDesc = awayFormWins !== null ? ` (${awayFormWins}/${awayForm.length} wins recently)` : "";

  if (homeWin >= 60) {
    overview = hasGoalData
      ? `${homeTeam} enters this ${match.league} fixture as clear favorites with ${homeWin}% win probability${homeFormDesc}. They average ${homeGoals.toFixed(1)} goals per game, while ${awayTeam} has ${awayWin}% away win chance${awayFormDesc}.`
      : `${homeTeam} enters this ${match.league} fixture as clear favorites with ${homeWin}% win probability${homeFormDesc}. ${awayTeam} sits on ${awayWin}% away win chance${awayFormDesc}, giving the home side a clear edge.`;
  } else if (awayWin >= 55) {
    overview = hasGoalData
      ? `${awayTeam} carries strong away momentum into this ${match.league} match with ${awayWin}% win probability${awayFormDesc}. Their output at ${awayGoals.toFixed(1)} goals/game supports the edge.`
      : `${awayTeam} carries strong away momentum into this ${match.league} match with ${awayWin}% win probability${awayFormDesc}, while ${homeTeam} remains at ${homeWin}%.`;
  } else if (drawProb >= 30) {
    overview = hasGoalData
      ? `This ${match.league} game looks balanced: draw chance is ${drawProb}% with combined goal profile at ${totalAvg.toFixed(1)} goals.`
      : `This ${match.league} game looks balanced with draw chance at ${drawProb}%, and neither side holding a dominant statistical edge.`;
  } else {
    overview = `${homeTeam} hosts ${awayTeam} in ${match.league}. AI probabilities are Home ${homeWin}% | Draw ${drawProb}% | Away ${awayWin}%, with overall confidence at ${confidence}%.`;
  }

  let reasoning: string;
  if (row.key_factors?.length) {
    reasoning = row.key_factors.join(". ") + ".";
  } else if ((prediction === "1" || prediction === "home") && hasGoalData) {
    reasoning = `${homeTeam} holds ${homeWin}% win probability with ${homeGoals.toFixed(1)} goals/game profile, while ${awayTeam} is at ${awayWin}% and ${awayGoals.toFixed(1)} goals/game.`;
  } else if ((prediction === "2" || prediction === "away") && hasGoalData) {
    reasoning = `${awayTeam} is favored at ${awayWin}% despite away status, with stronger attacking profile than ${homeTeam}.`;
  } else if (prediction.includes("over") && hasGoalData) {
    reasoning = `Combined average of ${totalAvg.toFixed(1)} goals supports the Over market with confidence ${confidence}%.`;
  } else if (prediction.includes("under") && hasGoalData) {
    reasoning = `Combined average of ${totalAvg.toFixed(1)} goals supports a tighter Under script with confidence ${confidence}%.`;
  } else {
    reasoning = `AI model combined team form, probabilities, and market signals to produce a ${confidence}% confidence prediction.`;
  }

  const keyStats = [
    { label: `${homeTeam} Win`, value: `${homeWin}%`, trend: (homeWin >= 50 ? "positive" : "neutral") as "positive" | "neutral" },
    { label: `${awayTeam} Win`, value: `${awayWin}%`, trend: (awayWin >= 50 ? "positive" : "neutral") as "positive" | "neutral" },
    { label: "Draw", value: `${drawProb}%`, trend: "neutral" as const },
    {
      label: "Risk Level",
      value: row.risk_level || "Medium",
      trend: (row.risk_level === "Low" ? "positive" : row.risk_level === "High" ? "negative" : "neutral") as
        | "positive"
        | "negative"
        | "neutral",
    },
    {
      label: `${homeTeam} Goals Avg`,
      value: hasGoalData ? homeGoals.toFixed(1) : "N/A",
      trend: (homeGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: `${awayTeam} Goals Avg`,
      value: hasGoalData ? awayGoals.toFixed(1) : "N/A",
      trend: (awayGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
  ];

  const insights = row.key_factors?.length
    ? row.key_factors
    : [
        `AI model confidence: ${confidence}%`,
        `Home win probability: ${homeWin}%`,
        `Away win probability: ${awayWin}%`,
        `Predicted risk level: ${row.risk_level || "Medium"}`,
      ];

  return {
    overview,
    keyStats,
    insights,
    prediction: { outcome, confidence, reasoning },
  };
}

export function useMatchPreviewGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [generatedMatch, setGeneratedMatch] = useState<Match | null>(null);

  const generateFromPrediction = useCallback((match: Match, row: MatchPreviewPredictionRow) => {
    setGeneratedMatch(match);
    const result = buildAnalysisFromPrediction(match, row);
    setAnalysis(result);
    return result;
  }, []);

  const generate = useCallback(
    async (match: Match) => {
      setIsGenerating(true);
      setAnalysis(null);
      setGeneratedMatch(match);

      try {
        const { data, error } = await supabase
          .from("ai_predictions")
          .select(
            "prediction, confidence, analysis, key_factors, home_win, draw, away_win, predicted_score, risk_level, last_home_goals, last_away_goals"
          )
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) console.error("Error fetching AI prediction:", error);

        if (data) {
          return generateFromPrediction(match, data);
        }

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
    },
    [generateFromPrediction]
  );

  const reset = useCallback(() => {
    setAnalysis(null);
    setGeneratedMatch(null);
  }, []);

  return { isGenerating, analysis, generatedMatch, generate, generateFromPrediction, reset };
}
