import { Brain, TrendingUp, BarChart3, Lightbulb, Sparkles, Shield, Target, Activity, CheckCircle2, Zap } from "lucide-react";
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

  // Home/Away strength
  if (homeWin >= 55) bullets.push(`${pred.home_team} strong at home with ${homeWin}% win probability`);
  else if (homeWin >= 40) bullets.push(`${pred.home_team} has moderate home form`);
  else bullets.push(`${pred.home_team} struggling at home recently`);

  if (awayWin >= 50) bullets.push(`${pred.away_team} dangerous on the road with ${awayWin}% away win chance`);
  else if (awayWin < 30) bullets.push(`${pred.away_team} struggles defensively away`);

  // Goal trends
  if (totalAvg >= 3.5) bullets.push("High-scoring trend in recent matches for both teams");
  else if (totalAvg <= 2.0) bullets.push("Low scoring trend in recent matches");
  else bullets.push("Moderate goal output expected based on recent form");

  // Dominance
  if (homeWin >= 60) bullets.push("Home team controls tempo and dominates possession");
  else if (awayWin >= 55) bullets.push("Away team shows strong counter-attacking threat");
  else bullets.push("Evenly matched contest expected");

  // Scoring patterns
  if (homeGoals >= 2) bullets.push(`${pred.home_team} averaging ${homeGoals} goals — clinical in front of goal`);
  if (awayGoals < 0.8) bullets.push(`${pred.away_team} averaging only ${awayGoals} goals — lacks firepower`);
  if (homeGoals >= 1.5 && awayGoals >= 1.5) bullets.push("Both teams capable of finding the net");

  return bullets.slice(0, 5);
}

function deriveAIInsight(pred: any): string {
  if (!pred) return "";
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const confidence = pred.confidence ?? 60;
  const totalGoals = (pred.last_home_goals ?? 0) + (pred.last_away_goals ?? 0);
  const diff = Math.abs(homeWin - awayWin);

  if (diff >= 30 && confidence >= 80)
    return `Model detects strong ${homeWin > awayWin ? "home" : "away"} advantage with low volatility`;
  if (diff >= 20 && confidence >= 70)
    return `AI identifies clear ${homeWin > awayWin ? "home" : "away"} edge — above-average prediction confidence`;
  if (totalGoals >= 3.5)
    return "Model flags high goal probability — both defenses vulnerable";
  if (totalGoals <= 1.5)
    return "AI detects tight, defensive matchup — low scoring outcome likely";
  if (diff < 10)
    return "Balanced match profile — model suggests cautious approach";
  return `AI confidence at ${confidence}% — moderate signal strength detected`;
}

function deriveGameType(pred: any): { label: string; tags: string[] } {
  if (!pred) return { label: "Standard", tags: [] };
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const totalAvg = homeGoals + awayGoals;
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const diff = Math.abs(homeWin - awayWin);

  const tags: string[] = [];

  if (totalAvg >= 3.5) { tags.push("High scoring"); }
  else if (totalAvg <= 2.0) { tags.push("Low scoring"); }
  else { tags.push("Moderate scoring"); }

  if (diff >= 25) { tags.push(homeWin > awayWin ? "Home dominance" : "Away dominance"); }
  else { tags.push("Competitive match"); }

  if (totalAvg <= 2.0 && diff >= 15) tags.push("Controlled game");
  if (totalAvg >= 3.0 && homeGoals >= 1.5 && awayGoals >= 1.5) tags.push("End-to-end action");
  if (homeGoals < 1 && awayGoals < 1) tags.push("Defensive battle");
  if (diff < 8) tags.push("Coin-flip match");

  const label = totalAvg >= 3.5 ? "Attack-heavy" : totalAvg <= 2.0 ? "Defensive" : "Balanced";
  return { label, tags: tags.slice(0, 4) };
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
  const gameType = deriveGameType(prediction);

  return (
    <div className="space-y-4">

      {/* 📊 Match Analysis */}
      {matchBullets.length > 0 && (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">📊 Match Analysis</h3>
          </div>
          <div className="p-4 space-y-2">
            {matchBullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-muted-foreground leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💡 AI Insight */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 p-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">AI Insight</span>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mt-0.5">💡 "{aiInsight}"</p>
          </div>
        </div>
      )}

      {/* ⚽ Game Type */}
      {gameType.tags.length > 0 && (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <Target className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">⚽ Match Type</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {gameType.tags.map((tag, idx) => (
              <Badge
                key={idx}
                className="bg-gray-100 dark:bg-muted/30 text-gray-700 dark:text-foreground border-gray-200 dark:border-border/40 px-3 py-1.5 text-xs font-semibold"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Key Stats Grid */}
      {analysis.keyStats.length > 0 && (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">📈 Key Stats</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.keyStats.map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl p-3 text-center border",
                  stat.trend === "positive" && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
                  stat.trend === "negative" && "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
                  stat.trend === "neutral" && "bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30"
                )}
              >
                <div className="text-[10px] text-gray-500 dark:text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
                  {stat.label}
                </div>
                <div className={cn(
                  "text-lg font-black",
                  stat.trend === "positive" && "text-emerald-600 dark:text-emerald-400",
                  stat.trend === "negative" && "text-red-600 dark:text-red-400",
                  stat.trend === "neutral" && "text-gray-700 dark:text-foreground"
                )}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 AI Prediction Summary */}
      <div className="bg-white dark:bg-card rounded-xl border border-emerald-100 dark:border-primary/30 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-emerald-50 dark:bg-primary/10 border-emerald-100 dark:border-primary/20">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-bold text-sm text-emerald-800 dark:text-primary">🎯 AI Prediction Summary</h3>
          <Badge className="ml-auto bg-emerald-100 dark:bg-primary/20 text-emerald-700 dark:text-primary border-emerald-200 dark:border-primary/30 text-[9px]">
            AI Generated
          </Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-wider mb-1">Expected Outcome</div>
              <div className="font-black text-xl text-emerald-700 dark:text-primary">{analysis.prediction.outcome}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-wider mb-1">Confidence</div>
              <div className={cn(
                "font-black text-2xl",
                analysis.prediction.confidence >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                analysis.prediction.confidence >= 60 ? "text-amber-600 dark:text-amber-400" : "text-gray-500"
              )}>
                {analysis.prediction.confidence}%
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/20">
            <p className="text-xs text-gray-600 dark:text-muted-foreground leading-relaxed">
              {analysis.prediction.reasoning}
            </p>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-muted-foreground/60 mt-3 text-center italic">
            AI-generated prediction based on statistical analysis. For informational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
