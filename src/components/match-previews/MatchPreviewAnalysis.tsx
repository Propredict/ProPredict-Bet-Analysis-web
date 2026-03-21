import { useState } from "react";
import { Brain, Lightbulb, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Swords, Shield, Flame, TrendingUp, TrendingDown, Minus, Target, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useH2H } from "@/hooks/useH2H";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewAnalysisProps {
  match: Match;
  analysis: MatchAnalysis | null;
  isLoading: boolean;
  prediction?: any;
}

export interface MatchAnalysis {
  overview: string;
  keyStats: {
    label: string;
    value: string;
    trend?: "positive" | "negative" | "neutral";
  }[];
  insights: string[];
  prediction: {
    outcome: string;
    confidence: number;
    reasoning: string;
  };
  matchAnalysis?: string[];
  aiInsight?: string;
  gameType?: { label: string; tags: string[] };
}

/* ─── Parse the AI analysis text for real match-specific data ─── */

interface ParsedAnalysis {
  homeForm: string | null;
  awayForm: string | null;
  homeFormRecord: string | null; // e.g. "7W 1D 2L"
  awayFormRecord: string | null;
  homeGoalsScored: number | null;
  homeGoalsConceded: number | null;
  awayGoalsScored: number | null;
  awayGoalsConceded: number | null;
  homeStreak: string | null;
  awayStreak: string | null;
  h2hHome: number | null;
  h2hDraws: number | null;
  h2hAway: number | null;
  h2hAvgGoals: number | null;
  homeRecord: string | null; // e.g. "13W 1D 2L"
  awayRecord: string | null;
  homeSeasonRecord: string | null;
  awaySeasonRecord: string | null;
  homeWinRate: string | null;
  awayWinRate: string | null;
  homeGD: string | null;
  awayGD: string | null;
  homeCleanSheets: number | null;
  awayCleanSheets: number | null;
  injuries: string[];
  verdict: string | null;
}

function parseAnalysisText(text: string | null): ParsedAnalysis {
  const result: ParsedAnalysis = {
    homeForm: null, awayForm: null,
    homeFormRecord: null, awayFormRecord: null,
    homeGoalsScored: null, homeGoalsConceded: null,
    awayGoalsScored: null, awayGoalsConceded: null,
    homeStreak: null, awayStreak: null,
    h2hHome: null, h2hDraws: null, h2hAway: null, h2hAvgGoals: null,
    homeRecord: null, awayRecord: null,
    homeSeasonRecord: null, awaySeasonRecord: null,
    homeWinRate: null, awayWinRate: null,
    homeGD: null, awayGD: null,
    homeCleanSheets: null, awayCleanSheets: null,
    injuries: [], verdict: null,
  };

  if (!text) return result;

  // Extract verdict
  const verdictMatch = text.match(/VERDICT:\s*(.+?)(?:\.|$)/m);
  if (verdictMatch) result.verdict = verdictMatch[1].trim();

  // Extract form strings like "WWWWDWWLWL"
  const formLines = text.match(/•\s*(.+?):\s*([WDL]{3,})\s*\(([^)]+)\)/g);
  if (formLines) {
    formLines.forEach((line, idx) => {
      const m = line.match(/•\s*(.+?):\s*([WDL]{3,})\s*\(([^)]+)\)/);
      if (!m) return;
      const formStr = m[2];
      const record = m[3]; // e.g. "7W 1D 2L"

      // Extract goals info from the same line context
      const goalsMatch = line.match(/(\d+)\s*goals?\s*scored.*?(\d+)\s*conceded/i);
      const avgMatch = line.match(/avg\s*([\d.]+)\/([\d.]+)/i);

      if (idx === 0) {
        result.homeForm = formStr;
        result.homeFormRecord = record;
        if (avgMatch) {
          result.homeGoalsScored = parseFloat(avgMatch[1]);
          result.homeGoalsConceded = parseFloat(avgMatch[2]);
        }
      } else {
        result.awayForm = formStr;
        result.awayFormRecord = record;
        if (avgMatch) {
          result.awayGoalsScored = parseFloat(avgMatch[1]);
          result.awayGoalsConceded = parseFloat(avgMatch[2]);
        }
      }
    });
  }

  // Also try to get goals from the full text around FORM section
  const formSection = text.match(/FORM.*?(?=⚔️|🏟️|📈|$)/s)?.[0] || "";
  const teamGoalsMatches = formSection.match(/•\s*(.+?):\s*[WDL]+.*?—\s*(\d+)\s*goals?\s*scored.*?(\d+)\s*conceded.*?avg\s*([\d.]+)\/([\d.]+)/g);
  if (teamGoalsMatches) {
    teamGoalsMatches.forEach((line, idx) => {
      const m = line.match(/avg\s*([\d.]+)\/([\d.]+)/);
      if (m) {
        if (idx === 0) {
          result.homeGoalsScored = parseFloat(m[1]);
          result.homeGoalsConceded = parseFloat(m[2]);
        } else {
          result.awayGoalsScored = parseFloat(m[1]);
          result.awayGoalsConceded = parseFloat(m[2]);
        }
      }
    });
  }

  // Extract streaks
  const streakMatches = text.match(/Current streak:\s*([WDL]\d+)/gi);
  if (streakMatches) {
    result.homeStreak = streakMatches[0]?.replace(/Current streak:\s*/i, "") || null;
    result.awayStreak = streakMatches[1]?.replace(/Current streak:\s*/i, "") || null;
  }

  // Extract H2H
  const h2hSection = text.match(/HEAD-TO-HEAD.*?(?=🏟️|📈|$)/s)?.[0] || "";
  const h2hWinsMatch = h2hSection.match(/(\w+)\s*wins?:\s*(\d+)\s*\|\s*Draws?:\s*(\d+)\s*\|\s*(\w+)\s*wins?:\s*(\d+)/i);
  if (h2hWinsMatch) {
    result.h2hHome = parseInt(h2hWinsMatch[2]);
    result.h2hDraws = parseInt(h2hWinsMatch[3]);
    result.h2hAway = parseInt(h2hWinsMatch[5]);
  }
  const h2hAvgMatch = h2hSection.match(/Avg goals\/match:\s*([\d.]+)/i);
  if (h2hAvgMatch) result.h2hAvgGoals = parseFloat(h2hAvgMatch[1]);

  // Extract home/away splits
  const homeAtHome = text.match(/at home:\s*(\d+W\s*\d+D\s*\d+L).*?GF\s*(\d+).*?GA\s*(\d+).*?avg\s*([\d.]+)\/([\d.]+)/i);
  if (homeAtHome) {
    result.homeRecord = homeAtHome[1];
    if (!result.homeGoalsScored) result.homeGoalsScored = parseFloat(homeAtHome[4]);
    if (!result.homeGoalsConceded) result.homeGoalsConceded = parseFloat(homeAtHome[5]);
  }

  const awayFromHome = text.match(/away:\s*(\d+W\s*\d+D\s*\d+L).*?GF\s*(\d+).*?GA\s*(\d+).*?avg\s*([\d.]+)\/([\d.]+)/i);
  if (awayFromHome) {
    result.awayRecord = awayFromHome[1];
    if (!result.awayGoalsScored) result.awayGoalsScored = parseFloat(awayFromHome[4]);
    if (!result.awayGoalsConceded) result.awayGoalsConceded = parseFloat(awayFromHome[5]);
  }

  // Extract season stats
  const seasonSection = text.match(/SEASON STATS.*?(?=🛡️|🔥|🚑|$)/s)?.[0] || "";
  const seasonLines = seasonSection.match(/•\s*(.+?):\s*(\d+W\s*\d+D\s*\d+L)\s*\((\d+%)\s*win rate\).*?GD\s*([+-]?\d+)/gi);
  if (seasonLines) {
    seasonLines.forEach((line, idx) => {
      const m = line.match(/(\d+W\s*\d+D\s*\d+L)\s*\((\d+%)\s*win rate\).*?GD\s*([+-]?\d+)/i);
      if (m) {
        if (idx === 0) {
          result.homeSeasonRecord = m[1];
          result.homeWinRate = m[2];
          result.homeGD = m[3];
        } else {
          result.awaySeasonRecord = m[1];
          result.awayWinRate = m[2];
          result.awayGD = m[3];
        }
      }
    });
  }

  // Extract clean sheets
  const csMatch = text.match(/clean sheets/gi);
  if (csMatch) {
    const csLines = text.match(/•\s*(.+?):\s*(\d+)\s*clean sheets/gi);
    if (csLines) {
      csLines.forEach((line, idx) => {
        const m = line.match(/(\d+)\s*clean sheets/i);
        if (m) {
          if (idx === 0) result.homeCleanSheets = parseInt(m[1]);
          else result.awayCleanSheets = parseInt(m[1]);
        }
      });
    }
  }

  // Extract injuries
  const injurySection = text.match(/INJURIES.*?(?=🎯|$)/s)?.[0] || "";
  const injuryItems = injurySection.match(/•\s*(.+?):\s*(.+)/g);
  if (injuryItems) {
    injuryItems.forEach(line => {
      const m = line.match(/•\s*(.+?):\s*(.+)/);
      if (m) {
        // Deduplicate injury names
        const players = [...new Set(m[2].split(",").map(s => s.trim()))];
        result.injuries.push(`${m[1].trim()}: ${players.join(", ")}`);
      }
    });
  }

  return result;
}

/* ─── Derived helpers using parsed data ─── */

function deriveAttackAnalysis(pred: any, parsed: ParsedAnalysis): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];
  const hg = parsed.homeGoalsScored ?? pred.last_home_goals ?? 0;
  const ag = parsed.awayGoalsScored ?? pred.last_away_goals ?? 0;

  items.push({
    label: `${pred.home_team} Attack`,
    detail: hg >= 2 ? `Averaging ${hg.toFixed(1)} goals/game — elite offensive output` : hg >= 1.2 ? `${hg.toFixed(1)} goals/game — solid attacking form` : `Only ${hg.toFixed(1)} goals/game — limited firepower`,
    trend: hg >= 1.5 ? "positive" : hg >= 1 ? "neutral" : "negative",
  });

  items.push({
    label: `${pred.away_team} Attack`,
    detail: ag >= 2 ? `${ag.toFixed(1)} goals away — dangerous on the road` : ag >= 1.2 ? `${ag.toFixed(1)} goals away — decent output` : `${ag.toFixed(1)} goals away — struggles to score`,
    trend: ag >= 1.5 ? "positive" : ag >= 1 ? "neutral" : "negative",
  });

  return items;
}

function deriveDefenseAnalysis(pred: any, parsed: ParsedAnalysis): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];
  const hConc = parsed.homeGoalsConceded ?? pred.last_away_goals ?? 0;
  const aConc = parsed.awayGoalsConceded ?? pred.last_home_goals ?? 0;

  const hCS = parsed.homeCleanSheets;
  const aCS = parsed.awayCleanSheets;

  items.push({
    label: `${pred.home_team} Defense`,
    detail: hConc <= 0.8
      ? `Conceding ${hConc.toFixed(1)}/game${hCS ? ` — ${hCS} clean sheets` : ""} — rock-solid`
      : hConc <= 1.5
      ? `${hConc.toFixed(1)} conceded/game${hCS ? ` (${hCS} CS)` : ""} — average defense`
      : `${hConc.toFixed(1)} conceded/game${hCS ? ` (${hCS} CS)` : ""} — vulnerable`,
    trend: hConc <= 0.8 ? "positive" : hConc <= 1.5 ? "neutral" : "negative",
  });

  items.push({
    label: `${pred.away_team} Defense`,
    detail: aConc <= 0.8
      ? `Conceding ${aConc.toFixed(1)} away${aCS ? ` — ${aCS} clean sheets` : ""} — well organized`
      : aConc <= 1.5
      ? `${aConc.toFixed(1)} conceded away${aCS ? ` (${aCS} CS)` : ""} — can be exposed`
      : `${aConc.toFixed(1)} conceded away${aCS ? ` (${aCS} CS)` : ""} — leaky defense`,
    trend: aConc <= 0.8 ? "positive" : aConc <= 1.5 ? "neutral" : "negative",
  });

  return items;
}

function deriveFormAnalysis(pred: any, parsed: ParsedAnalysis): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];

  const homeFormStr = parsed.homeForm;
  const awayFormStr = parsed.awayForm;
  const hw = pred.home_win ?? 0;
  const aw = pred.away_win ?? 0;

  if (homeFormStr) {
    const record = parsed.homeFormRecord || "";
    const streak = parsed.homeStreak || "";
    items.push({
      label: `${pred.home_team} Form`,
      detail: `${homeFormStr} (${record})${streak ? ` — streak: ${streak}` : ""}`,
      trend: hw >= 55 ? "positive" : hw >= 35 ? "neutral" : "negative",
    });
  } else {
    items.push({
      label: `${pred.home_team} Form`,
      detail: hw >= 60 ? `${hw}% home win rate — dominant at home` : hw >= 40 ? `${hw}% win rate — competitive form` : `${hw}% win rate — inconsistent`,
      trend: hw >= 55 ? "positive" : hw >= 35 ? "neutral" : "negative",
    });
  }

  if (awayFormStr) {
    const record = parsed.awayFormRecord || "";
    const streak = parsed.awayStreak || "";
    items.push({
      label: `${pred.away_team} Form`,
      detail: `${awayFormStr} (${record})${streak ? ` — streak: ${streak}` : ""}`,
      trend: aw >= 45 ? "positive" : aw >= 25 ? "neutral" : "negative",
    });
  } else {
    items.push({
      label: `${pred.away_team} Form`,
      detail: aw >= 50 ? `${aw}% away win rate — strong travellers` : aw >= 30 ? `${aw}% away win rate — average on road` : `${aw}% away win rate — struggles away`,
      trend: aw >= 45 ? "positive" : aw >= 25 ? "neutral" : "negative",
    });
  }

  return items;
}

function deriveGoalTrends(pred: any, parsed: ParsedAnalysis): { label: string; value: string; detail: string }[] {
  if (!pred) return [];
  const hg = parsed.homeGoalsScored ?? pred.last_home_goals ?? 0;
  const ag = parsed.awayGoalsScored ?? pred.last_away_goals ?? 0;
  const total = hg + ag;
  const btts = Math.min(95, 30 + Math.min(hg, ag) * 20 + (hg >= 1 && ag >= 1 ? 15 : 0));

  return [
    { label: "Expected Goals", value: total.toFixed(1), detail: total >= 3 ? "High-scoring match expected" : total >= 2 ? "Moderate scoring anticipated" : "Low-scoring match likely" },
    { label: "BTTS Probability", value: `${Math.round(btts)}%`, detail: btts >= 60 ? "Both teams likely to score" : "Clean sheet possible" },
    { label: "Over 2.5", value: `${Math.min(90, Math.round(20 + total * 12))}%`, detail: total >= 3 ? "Strong over signal" : "Under may be safer" },
  ];
}

function deriveWhyThisPrediction(pred: any, parsed: ParsedAnalysis): string[] {
  if (!pred) return [];
  const reasons: string[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const confidence = pred.confidence ?? 60;
  const prediction = (pred.prediction || "").toLowerCase();
  const hg = parsed.homeGoalsScored ?? pred.last_home_goals ?? 0;
  const ag = parsed.awayGoalsScored ?? pred.last_away_goals ?? 0;

  if (prediction === "1" || prediction === "home") {
    reasons.push(`Home probability ${homeWin}% vs away ${awayWin}%`);
    if (parsed.homeForm) reasons.push(`Home form: ${parsed.homeForm} (${parsed.homeFormRecord})`);
    if (parsed.homeRecord) reasons.push(`Home record: ${parsed.homeRecord}`);
    if (hg >= 1.2) reasons.push(`${pred.home_team} avg ${hg.toFixed(1)} goals at home`);
    if (parsed.awayRecord) reasons.push(`${pred.away_team} away: ${parsed.awayRecord}`);
  } else if (prediction === "2" || prediction === "away") {
    reasons.push(`Away probability ${awayWin}% outperforms home ${homeWin}%`);
    if (parsed.awayForm) reasons.push(`Away form: ${parsed.awayForm} (${parsed.awayFormRecord})`);
    if (ag >= 1.2) reasons.push(`${pred.away_team} avg ${ag.toFixed(1)} goals away`);
  } else if (prediction.includes("over")) {
    const total = hg + ag;
    reasons.push(`Combined avg ${total.toFixed(1)} goals supports over`);
    reasons.push(`${pred.home_team}: ${hg.toFixed(1)}, ${pred.away_team}: ${ag.toFixed(1)}`);
  } else if (prediction.includes("under")) {
    const total = hg + ag;
    reasons.push(`Low combined avg ${total.toFixed(1)} goals`);
    reasons.push(`Limited firepower from both sides`);
  } else {
    reasons.push(`Win probabilities: Home ${homeWin}% | Draw ${pred.draw}% | Away ${awayWin}%`);
  }

  // Add H2H info from parsed data
  if (parsed.h2hHome !== null) {
    reasons.push(`H2H record: ${parsed.h2hHome}W-${parsed.h2hDraws}D-${parsed.h2hAway}L`);
  }

  // Add season context
  if (parsed.homeWinRate && (prediction === "1" || prediction === "home")) {
    reasons.push(`Season win rate: ${parsed.homeWinRate} (GD: ${parsed.homeGD})`);
  }

  reasons.push(`AI confidence: ${confidence}%`);
  return reasons.slice(0, 6);
}

function deriveAIInsight(pred: any, parsed: ParsedAnalysis): string {
  if (!pred) return "";
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const confidence = pred.confidence ?? 60;
  const hg = parsed.homeGoalsScored ?? pred.last_home_goals ?? 0;
  const ag = parsed.awayGoalsScored ?? pred.last_away_goals ?? 0;
  const totalGoals = hg + ag;
  const diff = Math.abs(homeWin - awayWin);
  const prediction = (pred.prediction || "").toLowerCase();

  // Use parsed data for more specific insights
  if (parsed.homeForm && parsed.awayForm) {
    const homeWins = (parsed.homeForm.match(/W/g) || []).length;
    const awayLosses = (parsed.awayForm.match(/L/g) || []).length;
    if (homeWins >= 6 && awayLosses >= 5)
      return `Dominant home form (${homeWins}/10 wins) vs struggling visitors (${awayLosses}/10 losses) — strong value detected`;
  }

  if (parsed.h2hHome !== null && parsed.h2hAway !== null) {
    const total = (parsed.h2hHome || 0) + (parsed.h2hDraws || 0) + (parsed.h2hAway || 0);
    if (parsed.h2hHome >= 4 && total >= 5)
      return `H2H dominance (${parsed.h2hHome}/${total} wins) reinforces prediction at ${confidence}% confidence`;
  }

  if (prediction.includes("over") && totalGoals >= 3)
    return `High goal expectancy (avg ${totalGoals.toFixed(1)}) — over market strongest`;
  if (prediction.includes("under") && totalGoals <= 2)
    return `Defensive pattern flagged — under market favored`;
  if (diff >= 30 && confidence >= 80)
    return `Strong ${homeWin > awayWin ? "home" : "away"} edge — ${confidence}% confidence, low volatility`;
  if (diff >= 20)
    return `Clear statistical edge detected for ${homeWin > awayWin ? "home" : "away"} side`;
  if (totalGoals >= 3.5)
    return `Both defenses vulnerable — high goal probability flagged`;
  if (totalGoals <= 1.5)
    return `Tight defensive matchup — low scoring outcome likely`;
  return `Model confidence at ${confidence}% — moderate signal detected`;
}

/* ─── Season Stats Grid ─── */

function deriveSeasonStats(pred: any, parsed: ParsedAnalysis): { team: string; record: string; winRate: string; gd: string }[] {
  const stats: { team: string; record: string; winRate: string; gd: string }[] = [];
  if (parsed.homeSeasonRecord && parsed.homeWinRate) {
    stats.push({ team: pred.home_team, record: parsed.homeSeasonRecord, winRate: parsed.homeWinRate, gd: parsed.homeGD || "0" });
  }
  if (parsed.awaySeasonRecord && parsed.awayWinRate) {
    stats.push({ team: pred.away_team, record: parsed.awaySeasonRecord, winRate: parsed.awayWinRate, gd: parsed.awayGD || "0" });
  }
  return stats;
}

const TrendIcon = ({ trend }: { trend: "positive" | "negative" | "neutral" }) => {
  if (trend === "positive") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "negative") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-amber-400" />;
};

const trendColor = (t: "positive" | "negative" | "neutral") =>
  t === "positive" ? "border-emerald-500/20 bg-emerald-500/5" : t === "negative" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5";

/* ─── Component ─── */

export function MatchPreviewAnalysis({ match, analysis, isLoading, prediction }: MatchPreviewAnalysisProps) {
  const [showMore, setShowMore] = useState(false);

  const homeTeamId = match?.homeTeamId ?? 0;
  const awayTeamId = match?.awayTeamId ?? 0;
  const { data: h2hData, isLoading: h2hLoading } = useH2H(
    showMore && homeTeamId ? homeTeamId : null,
    showMore && awayTeamId ? awayTeamId : null
  );

  if (isLoading) return <AnalysisSkeleton />;
  if (!analysis) return null;

  // Parse the rich analysis text for match-specific data
  const parsed = parseAnalysisText(prediction?.analysis);

  const whyReasons = deriveWhyThisPrediction(prediction, parsed);
  const attackAnalysis = deriveAttackAnalysis(prediction, parsed);
  const defenseAnalysis = deriveDefenseAnalysis(prediction, parsed);
  const formAnalysis = deriveFormAnalysis(prediction, parsed);
  const goalTrends = deriveGoalTrends(prediction, parsed);
  const aiInsight = deriveAIInsight(prediction, parsed);
  const seasonStats = deriveSeasonStats(prediction, parsed);

  return (
    <div className="space-y-3">

      {/* 🧠 Why This Prediction */}
      {whyReasons.length > 0 && (
        <SectionCard
          icon={<Brain className="h-3.5 w-3.5" />}
          iconGradient="from-violet-600 to-purple-600"
          title="🧠 Why This Prediction"
        >
          <div className="space-y-2.5">
            {whyReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold",
                  idx === 0 ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
                )}>
                  {idx + 1}
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 📊 AI Match Analysis — text overview */}
      <SectionCard
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        iconGradient="from-blue-600 to-indigo-600"
        title="📊 AI Match Analysis"
      >
        <div className="space-y-3">
          {/* Main overview paragraph from AI */}
          {analysis.overview && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {analysis.overview}
            </p>
          )}

          {/* AI reasoning / prediction logic */}
          {analysis.prediction?.reasoning && (
            <div className="bg-muted/20 rounded-xl p-3 border border-border/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">AI Reasoning</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysis.prediction.reasoning}
              </p>
            </div>
          )}

          {/* Key factors as concise bullet points */}
          {prediction?.key_factors && prediction.key_factors.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Key Factors</span>
              {prediction.key_factors.slice(0, 5).map((factor: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{factor}</span>
                </div>
              ))}
            </div>
          )}

          {/* Goal Trends mini grid */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Goal Trends</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {goalTrends.map((gt, idx) => (
                <div key={idx} className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/30">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{gt.label}</div>
                  <div className="text-base font-black text-foreground mt-0.5">{gt.value}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{gt.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 📈 Season Comparison */}
      {seasonStats.length > 0 && (
        <SectionCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          iconGradient="from-emerald-600 to-teal-600"
          title="📈 Season Stats"
        >
          <div className="space-y-2">
            {seasonStats.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted/20 rounded-xl p-3 border border-border/20">
                <span className="text-xs font-bold text-foreground truncate flex-1">{s.team}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="text-[9px] font-bold">{s.record}</Badge>
                  <span className={cn(
                    "text-xs font-black",
                    parseInt(s.winRate) >= 50 ? "text-emerald-400" : parseInt(s.winRate) >= 30 ? "text-amber-400" : "text-red-400"
                  )}>{s.winRate}</span>
                  <span className={cn(
                    "text-[10px] font-bold",
                    s.gd.startsWith("+") ? "text-emerald-400" : s.gd.startsWith("-") ? "text-red-400" : "text-muted-foreground"
                  )}>GD {s.gd}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 🚑 Injuries */}
      {parsed.injuries.length > 0 && (
        <SectionCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          iconGradient="from-red-600 to-rose-600"
          title="🚑 Injuries & Suspensions"
        >
          <div className="space-y-1.5">
            {parsed.injuries.map((injury, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-red-400 shrink-0">•</span>
                <span>{injury}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 💡 AI Insight */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">AI Insight</span>
            <p className="text-xs font-semibold text-amber-200 mt-1 leading-relaxed">💡 "{aiInsight}"</p>
          </div>
        </div>
      )}

      {/* ─── Show More / H2H ─── */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMore(!showMore)}
          className="w-full gap-2 text-xs font-bold rounded-xl border-border/50 bg-card hover:bg-muted/40"
        >
          {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showMore ? "Show Less" : "Show More — Head to Head & Details"}
        </Button>
      </div>

      {showMore && (
        <SectionCard
          icon={<Swords className="h-3.5 w-3.5" />}
          iconGradient="from-teal-600 to-cyan-600"
          title="⚔️ Head to Head"
        >
          {h2hLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : h2hData && h2hData.seasons?.length > 0 ? (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center border border-emerald-500/20">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">{h2hData.team1?.name?.split(" ")[0] || "Home"}</div>
                  <div className="text-xl font-black text-emerald-400">{h2hData.summary?.team1Wins ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Wins</div>
                </div>
                <div className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/30">
                  <div className="text-[9px] text-muted-foreground font-bold uppercase">Draws</div>
                  <div className="text-xl font-black text-foreground">{h2hData.summary?.draws ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Total</div>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-2.5 text-center border border-blue-500/20">
                  <div className="text-[9px] text-blue-400 font-bold uppercase">{h2hData.team2?.name?.split(" ")[0] || "Away"}</div>
                  <div className="text-xl font-black text-blue-400">{h2hData.summary?.team2Wins ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Wins</div>
                </div>
              </div>

              {/* Recent matches */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Matches</div>
                <div className="divide-y divide-border/20">
                  {h2hData.seasons.flatMap(s => s.matches).slice(0, 6).map((m, idx) => {
                    const homeWon = m.teams.home.winner === true;
                    const awayWon = m.teams.away.winner === true;
                    const draw = !homeWon && !awayWon;
                    return (
                      <div key={idx} className="flex items-center py-3 px-1 gap-3">
                        <span className="text-[10px] text-muted-foreground w-[70px] shrink-0">
                          {new Date(m.fixture.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>
                        <span className={cn("text-xs font-semibold flex-1 truncate", homeWon ? "text-emerald-400" : "text-foreground/80")}>
                          {m.teams.home.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn(
                            "text-sm font-black w-7 h-7 rounded-md flex items-center justify-center",
                            homeWon ? "bg-emerald-500/20 text-emerald-400" : draw ? "bg-muted/30 text-foreground/60" : "bg-muted/20 text-foreground/50"
                          )}>
                            {m.goals.home ?? 0}
                          </span>
                          <span className="text-[10px] text-muted-foreground">-</span>
                          <span className={cn(
                            "text-sm font-black w-7 h-7 rounded-md flex items-center justify-center",
                            awayWon ? "bg-emerald-500/20 text-emerald-400" : draw ? "bg-muted/30 text-foreground/60" : "bg-muted/20 text-foreground/50"
                          )}>
                            {m.goals.away ?? 0}
                          </span>
                        </div>
                        <span className={cn("text-xs font-semibold flex-1 truncate text-right", awayWon ? "text-emerald-400" : "text-foreground/80")}>
                          {m.teams.away.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Swords className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No head-to-head data available for this matchup</p>
            </div>
          )}
        </SectionCard>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center italic pt-1">
        AI-generated prediction based on statistical analysis. For informational purposes only.
      </p>
    </div>
  );
}

/* ─── Reusable sub-components ─── */

function SectionCard({ icon, iconGradient, title, children }: { icon: React.ReactNode; iconGradient: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br", iconGradient)}>
          {icon}
        </div>
        <span className="font-bold text-sm text-foreground">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AnalysisSubSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function AnalysisRow({ label, detail, trend }: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }) {
  return (
    <div className={cn("flex items-start gap-2.5 p-2.5 rounded-xl border", trendColor(trend))}>
      <TrendIcon trend={trend} />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold text-foreground">{label}</span>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
