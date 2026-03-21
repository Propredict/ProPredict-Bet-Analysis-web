import { Brain, TrendingUp, BarChart3, Lightbulb, Target, Activity, CheckCircle2, Zap, Shield, Flame, Crosshair } from "lucide-react";
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
  const draw = pred.draw ?? 0;
  const totalAvg = homeGoals + awayGoals;
  const confidence = pred.confidence ?? 60;

  // Home team analysis
  if (homeWin >= 65) bullets.push(`${pred.home_team} dominant at home — ${homeWin}% win probability indicates strong form`);
  else if (homeWin >= 50) bullets.push(`${pred.home_team} has solid home record — ${homeWin}% chance of victory`);
  else if (homeWin >= 35) bullets.push(`${pred.home_team} inconsistent at home — only ${homeWin}% win probability`);
  else bullets.push(`${pred.home_team} struggling at home — ${homeWin}% win chance raises concern`);

  // Away team analysis
  if (awayWin >= 55) bullets.push(`${pred.away_team} strong away form — ${awayWin}% win chance makes them a threat`);
  else if (awayWin >= 35) bullets.push(`${pred.away_team} capable on the road with ${awayWin}% away win probability`);
  else bullets.push(`${pred.away_team} finding it tough away from home — only ${awayWin}% chance`);

  // Goal trends - unique per match
  if (totalAvg >= 4.0) bullets.push(`Combined avg of ${totalAvg.toFixed(1)} goals — expect an entertaining, open match`);
  else if (totalAvg >= 2.5) bullets.push(`Moderate ${totalAvg.toFixed(1)} goals average — balanced attacking output expected`);
  else if (totalAvg >= 1.5) bullets.push(`Low ${totalAvg.toFixed(1)} goals average — tight, tactical affair anticipated`);
  else bullets.push(`Very low ${totalAvg.toFixed(1)} goals average — defensive masterclass likely`);

  // Draw likelihood
  if (draw >= 30) bullets.push(`Draw probability at ${draw}% — both teams evenly matched`);

  // Specific scoring patterns
  if (homeGoals >= 2.0) bullets.push(`${pred.home_team} averaging ${homeGoals.toFixed(1)} goals — clinical finishing expected`);
  if (awayGoals >= 2.0) bullets.push(`${pred.away_team} averaging ${awayGoals.toFixed(1)} goals — potent attack on the road`);
  if (homeGoals < 0.8) bullets.push(`${pred.home_team} averaging just ${homeGoals.toFixed(1)} goals — creativity issues`);
  if (awayGoals < 0.8) bullets.push(`${pred.away_team} averaging just ${awayGoals.toFixed(1)} goals — lacks away firepower`);

  // Confidence-based insight
  if (confidence >= 85) bullets.push(`AI model highly confident at ${confidence}% — strong statistical signals detected`);
  else if (confidence >= 70) bullets.push(`AI confidence at ${confidence}% — reliable prediction with clear indicators`);

  return bullets.slice(0, 5);
}

function deriveAIInsight(pred: any): string {
  if (!pred) return "";
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const confidence = pred.confidence ?? 60;
  const totalGoals = (pred.last_home_goals ?? 0) + (pred.last_away_goals ?? 0);
  const diff = Math.abs(homeWin - awayWin);
  const prediction = (pred.prediction || "").toLowerCase();

  if (prediction.includes("over") && totalGoals >= 3)
    return `Model identifies high goal expectancy (avg ${totalGoals.toFixed(1)}) — over market shows strongest value`;
  if (prediction.includes("under") && totalGoals <= 2)
    return `Defensive metrics flag low-scoring pattern (avg ${totalGoals.toFixed(1)}) — under market favored`;
  if (prediction.includes("btts"))
    return `Both teams show scoring consistency — BTTS pattern detected across recent fixtures`;
  if (diff >= 30 && confidence >= 80)
    return `Strong ${homeWin > awayWin ? "home" : "away"} advantage detected — ${confidence}% confidence with low volatility`;
  if (diff >= 20 && confidence >= 70)
    return `Clear ${homeWin > awayWin ? "home" : "away"} edge identified — above-average signal strength at ${confidence}%`;
  if (draw >= 32)
    return `High draw probability (${draw}%) — tactical balance suggests stalemate`;
  if (totalGoals >= 3.5)
    return `High goal probability flagged — both defenses show vulnerability (avg ${totalGoals.toFixed(1)} goals)`;
  if (totalGoals <= 1.5)
    return `Tight defensive matchup detected — low scoring outcome likely (avg ${totalGoals.toFixed(1)} goals)`;
  if (diff < 10)
    return `Balanced match profile — model suggests cautious approach with ${confidence}% confidence`;
  return `AI confidence at ${confidence}% — ${homeWin > awayWin ? "slight home" : "slight away"} lean with moderate signal`;
}

function deriveGameType(pred: any): { label: string; tags: string[] } {
  if (!pred) return { label: "Standard", tags: [] };
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const totalAvg = homeGoals + awayGoals;
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const diff = Math.abs(homeWin - awayWin);

  const tags: string[] = [];

  if (totalAvg >= 3.5) tags.push("High scoring");
  else if (totalAvg <= 1.8) tags.push("Low scoring");
  else tags.push("Moderate scoring");

  if (diff >= 25) tags.push(homeWin > awayWin ? "Home dominance" : "Away dominance");
  else if (diff >= 10) tags.push(homeWin > awayWin ? "Home advantage" : "Away edge");
  else tags.push("Competitive match");

  if (totalAvg <= 2.0 && diff >= 15) tags.push("Controlled game");
  if (totalAvg >= 3.0 && homeGoals >= 1.5 && awayGoals >= 1.5) tags.push("End-to-end action");
  if (homeGoals < 0.8 && awayGoals < 0.8) tags.push("Defensive battle");
  if (draw >= 30) tags.push("Draw-prone");
  if (diff < 8) tags.push("Coin-flip match");

  const label = totalAvg >= 3.5 ? "Attack-heavy" : totalAvg <= 2.0 ? "Defensive" : "Balanced";
  return { label, tags: tags.slice(0, 4) };
}

function deriveWhyThisPrediction(pred: any): string[] {
  if (!pred) return [];
  const reasons: string[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const confidence = pred.confidence ?? 60;
  const prediction = (pred.prediction || "").toLowerCase();
  const totalAvg = homeGoals + awayGoals;

  if (prediction === "1" || prediction === "home") {
    reasons.push(`Home win probability ${homeWin}% significantly higher than away ${awayWin}%`);
    if (homeGoals >= 1.5) reasons.push(`${pred.home_team} averaging ${homeGoals.toFixed(1)} goals at home — strong offensive output`);
    if (awayGoals < 1.2) reasons.push(`${pred.away_team} scoring only ${awayGoals.toFixed(1)} goals away — limited threat`);
    reasons.push(`Historical data and form analysis supports home victory with ${confidence}% confidence`);
  } else if (prediction === "2" || prediction === "away") {
    reasons.push(`Away win probability ${awayWin}% outperforms home ${homeWin}%`);
    if (awayGoals >= 1.5) reasons.push(`${pred.away_team} averaging ${awayGoals.toFixed(1)} goals — strong away attack`);
    if (homeGoals < 1.2) reasons.push(`${pred.home_team} struggling with ${homeGoals.toFixed(1)} goals — home advantage negated`);
    reasons.push(`Model identifies away value play at ${confidence}% confidence`);
  } else if (prediction === "x" || prediction === "draw") {
    reasons.push(`Draw probability at ${draw}% — teams closely matched`);
    reasons.push(`Small gap between home (${homeWin}%) and away (${awayWin}%) win chances`);
    reasons.push(`Recent form suggests neither side has clear advantage`);
  } else if (prediction.includes("over")) {
    reasons.push(`Combined goal average of ${totalAvg.toFixed(1)} supports over market`);
    if (homeGoals >= 1.5) reasons.push(`${pred.home_team} scoring ${homeGoals.toFixed(1)} goals on average`);
    if (awayGoals >= 1.0) reasons.push(`${pred.away_team} contributing ${awayGoals.toFixed(1)} goals per match`);
    reasons.push(`Both teams show attacking intent — goal-heavy fixture expected`);
  } else if (prediction.includes("under")) {
    reasons.push(`Low combined average of ${totalAvg.toFixed(1)} goals per match`);
    if (homeGoals < 1.5) reasons.push(`${pred.home_team} limited to ${homeGoals.toFixed(1)} goals — defensive setup`);
    if (awayGoals < 1.0) reasons.push(`${pred.away_team} averaging only ${awayGoals.toFixed(1)} goals away`);
    reasons.push(`Tight defensive patterns detected — low-scoring outcome likely`);
  } else if (prediction.includes("btts")) {
    reasons.push(`Both teams show consistent scoring ability`);
    if (homeGoals >= 1.0) reasons.push(`${pred.home_team}: ${homeGoals.toFixed(1)} goals avg — will find the net`);
    if (awayGoals >= 1.0) reasons.push(`${pred.away_team}: ${awayGoals.toFixed(1)} goals avg — capable of scoring`);
    reasons.push(`Recent head-to-head suggests both defenses are vulnerable`);
  } else {
    reasons.push(`AI model confidence at ${confidence}% based on comprehensive data analysis`);
    reasons.push(`Win probabilities: ${pred.home_team} ${homeWin}% | Draw ${draw}% | ${pred.away_team} ${awayWin}%`);
  }

  // Add key_factors if available
  if (pred.key_factors?.length > 0) {
    pred.key_factors.slice(0, 2).forEach((f: string) => reasons.push(f));
  }

  return reasons.slice(0, 5);
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
  const whyReasons = deriveWhyThisPrediction(prediction);

  return (
    <div className="space-y-4">

      {/* 🧠 Why This Prediction - NEW SECTION */}
      {whyReasons.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-violet-100 dark:border-violet-500/20">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200 dark:shadow-none">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">🧠 Why This Prediction?</h3>
              <p className="text-[10px] text-gray-500 dark:text-muted-foreground">AI reasoning breakdown</p>
            </div>
            <Badge className="ml-auto bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 text-[9px] font-bold">
              AI Analysis
            </Badge>
          </div>
          <div className="p-5 space-y-3">
            {whyReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
                  idx === 0 ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300" :
                  "bg-gray-100 dark:bg-muted/30 text-gray-500 dark:text-muted-foreground"
                )}>
                  {idx + 1}
                </div>
                <span className="text-sm text-gray-700 dark:text-muted-foreground leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 Match Analysis */}
      {matchBullets.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-100 dark:border-blue-500/20">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200 dark:shadow-none">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">📊 Match Analysis</h3>
          </div>
          <div className="p-5 space-y-3">
            {matchBullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-muted-foreground leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💡 AI Insight */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-500/10 dark:via-yellow-500/10 dark:to-orange-500/10 rounded-2xl border border-amber-200/80 dark:border-amber-500/30 p-5 flex items-start gap-3.5 shadow-sm">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0 shadow-md shadow-amber-200 dark:shadow-none">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">AI Insight</span>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mt-1 leading-relaxed">💡 "{aiInsight}"</p>
          </div>
        </div>
      )}

      {/* ⚽ Game Type */}
      {gameType.tags.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-100 dark:border-emerald-500/20">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200 dark:shadow-none">
              <Crosshair className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">⚽ Match Type</h3>
            <Badge className="ml-auto bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 text-[9px] font-bold uppercase">
              {gameType.label}
            </Badge>
          </div>
          <div className="p-5 flex flex-wrap gap-2.5">
            {gameType.tags.map((tag, idx) => (
              <Badge
                key={idx}
                className="bg-gray-50 dark:bg-muted/20 text-gray-700 dark:text-foreground border-gray-200 dark:border-border/40 px-4 py-2 text-xs font-semibold rounded-xl"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 📈 Key Stats Grid */}
      {analysis.keyStats.length > 0 && (
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-100 dark:border-amber-500/20">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200 dark:shadow-none">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">📈 Key Stats</h3>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.keyStats.map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl p-3.5 text-center border transition-all",
                  stat.trend === "positive" && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
                  stat.trend === "negative" && "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
                  stat.trend === "neutral" && "bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30"
                )}
              >
                <div className="text-[10px] text-gray-500 dark:text-muted-foreground mb-1.5 font-semibold uppercase tracking-wider">
                  {stat.label}
                </div>
                <div className={cn(
                  "text-xl font-black",
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
      <div className="bg-white dark:bg-card rounded-2xl border border-emerald-100 dark:border-primary/30 shadow-md overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-primary/10 dark:to-primary/5 border-emerald-100 dark:border-primary/20">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200 dark:shadow-none">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-emerald-800 dark:text-primary">🎯 AI Prediction Summary</h3>
          <Badge className="ml-auto bg-emerald-100 dark:bg-primary/20 text-emerald-700 dark:text-primary border-emerald-200 dark:border-primary/30 text-[9px] font-bold">
            AI Generated
          </Badge>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-widest mb-1.5">Expected Outcome</div>
              <div className="font-black text-xl text-emerald-700 dark:text-primary">{analysis.prediction.outcome}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-widest mb-1.5">Confidence</div>
              <div className={cn(
                "font-black text-3xl",
                analysis.prediction.confidence >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                analysis.prediction.confidence >= 60 ? "text-amber-600 dark:text-amber-400" : "text-gray-500"
              )}>
                {analysis.prediction.confidence}%
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/20">
            <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
              {analysis.prediction.reasoning}
            </p>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-muted-foreground/60 mt-4 text-center italic">
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
        <div key={i} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gray-50 dark:bg-muted/20 border-gray-100">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
