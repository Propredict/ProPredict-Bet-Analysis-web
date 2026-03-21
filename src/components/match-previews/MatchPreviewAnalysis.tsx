import { Brain, Lightbulb, BarChart3, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

function deriveMatchAnalysis(pred: any): string[] {
  if (!pred) return [];
  const bullets: string[] = [];
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const totalAvg = homeGoals + awayGoals;

  if (homeWin >= 55) bullets.push(`${pred.home_team} strong at home (${homeWin}% win chance)`);
  else if (homeWin < 35) bullets.push(`${pred.home_team} struggling at home`);

  if (awayWin >= 50) bullets.push(`${pred.away_team} dangerous away (${awayWin}%)`);
  else if (awayWin < 30) bullets.push(`${pred.away_team} weak defensively away`);

  if (totalAvg >= 3.5) bullets.push("High scoring trend in recent matches");
  else if (totalAvg <= 2.0) bullets.push("Low scoring trend expected");
  else bullets.push("Moderate goal output expected");

  return bullets.slice(0, 3);
}

function deriveAIInsight(pred: any): string {
  if (!pred) return "";
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const confidence = pred.confidence ?? 60;
  const totalGoals = (pred.last_home_goals ?? 0) + (pred.last_away_goals ?? 0);
  const diff = Math.abs(homeWin - awayWin);
  const prediction = (pred.prediction || "").toLowerCase();

  if (prediction.includes("over") && totalGoals >= 3)
    return `High goal expectancy detected (avg ${totalGoals.toFixed(1)}) — over market strongest`;
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

function deriveWhyThisPrediction(pred: any): string[] {
  if (!pred) return [];
  const reasons: string[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const confidence = pred.confidence ?? 60;
  const prediction = (pred.prediction || "").toLowerCase();
  const totalAvg = homeGoals + awayGoals;

  if (prediction === "1" || prediction === "home") {
    reasons.push(`Home probability ${homeWin}% vs away ${awayWin}%`);
    if (homeGoals >= 1.5) reasons.push(`${pred.home_team} avg ${homeGoals.toFixed(1)} goals at home`);
    if (awayGoals < 1.2) reasons.push(`${pred.away_team} only ${awayGoals.toFixed(1)} goals away`);
  } else if (prediction === "2" || prediction === "away") {
    reasons.push(`Away probability ${awayWin}% outperforms home ${homeWin}%`);
    if (awayGoals >= 1.5) reasons.push(`${pred.away_team} avg ${awayGoals.toFixed(1)} goals away`);
  } else if (prediction.includes("over")) {
    reasons.push(`Combined avg ${totalAvg.toFixed(1)} goals supports over`);
    reasons.push(`${pred.home_team}: ${homeGoals.toFixed(1)}, ${pred.away_team}: ${awayGoals.toFixed(1)}`);
  } else if (prediction.includes("under")) {
    reasons.push(`Low combined avg ${totalAvg.toFixed(1)} goals`);
    reasons.push(`Limited firepower from both sides`);
  } else {
    reasons.push(`Win probabilities: Home ${homeWin}% | Draw ${pred.draw}% | Away ${awayWin}%`);
  }

  if (pred.key_factors?.length > 0) {
    pred.key_factors.slice(0, 2).forEach((f: string) => reasons.push(f));
  }

  reasons.push(`AI confidence: ${confidence}%`);
  return reasons.slice(0, 4);
}

export function MatchPreviewAnalysis({
  match,
  analysis,
  isLoading,
  prediction,
}: MatchPreviewAnalysisProps) {
  if (isLoading) return <AnalysisSkeleton />;
  if (!analysis) return null;

  const matchBullets = deriveMatchAnalysis(prediction);
  const aiInsight = deriveAIInsight(prediction);
  const whyReasons = deriveWhyThisPrediction(prediction);

  return (
    <div className="space-y-3">

      {/* 🧠 Why This Prediction */}
      {whyReasons.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600 text-white">
              <Brain className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-sm text-foreground">🧠 Why This Prediction</span>
          </div>
          <div className="p-4 space-y-2.5">
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
        </div>
      )}

      {/* 📊 Match Analysis - max 3 bullets */}
      {matchBullets.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-sm text-foreground">📊 Analysis</span>
          </div>
          <div className="p-4 space-y-2">
            {matchBullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💡 AI Insight - highlight box */}
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

      <p className="text-[9px] text-muted-foreground/50 text-center italic pt-1">
        AI-generated prediction based on statistical analysis. For informational purposes only.
      </p>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <div key={i} className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
