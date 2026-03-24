import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  deriveMarkets, 
  getBadgeStyles, 
  getBadgeLabel, 
  getRiskLevelColor,
  calculateGoalMarketProbs,
  getBestMarketProbability,
} from "../utils/marketDerivation";
import { Star, Shield, Trophy, TrendingUp, Target, Zap, Flame, CheckCircle } from "lucide-react";

type PickCandidate = { label: string; conf: number; icon: React.ReactNode };

/** Determine the best pick across all markets with an icon, using Poisson data */
function getBestPickCandidates(prediction: AIPrediction): PickCandidate[] {
  const hw = prediction.home_win ?? 0;
  const aw = prediction.away_win ?? 0;
  const d = prediction.draw ?? 0;
  const probs = calculateGoalMarketProbs(prediction);

  const norm1 = hw > 0 ? Math.round(hw * (100 / (hw + Math.max(aw, d)))) : 0;
  const norm2 = aw > 0 ? Math.round(aw * (100 / (aw + Math.max(hw, d)))) : 0;
  const normX = d > 0 ? Math.round(d * (100 / (d + Math.max(hw, aw)))) : 0;

  const candidates: PickCandidate[] = [
    { label: `${prediction.home_team} Win`, conf: norm1, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { label: `${prediction.away_team} Win`, conf: norm2, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { label: "Draw", conf: normX, icon: <Target className="w-4 h-4 text-blue-400" /> },
    { label: "Over 2.5 Goals", conf: probs.over25, icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
    { label: "Under 2.5 Goals", conf: probs.under25, icon: <TrendingUp className="w-4 h-4 text-orange-400" /> },
    { label: "BTTS Yes", conf: probs.bttsYes, icon: <Zap className="w-4 h-4 text-yellow-400" /> },
    { label: "BTTS No", conf: probs.bttsNo, icon: <Zap className="w-4 h-4 text-red-400" /> },
  ];

  candidates.sort((a, b) => b.conf - a.conf);
  return candidates;
}

/** Detect Value Bet: best pick ≥72% AND edge over 2nd best ≥12% */
export function isValueBet(prediction: AIPrediction): boolean {
  const c = getBestPickCandidates(prediction);
  if (c.length < 2) return false;
  return c[0].conf >= 72 && (c[0].conf - c[1].conf) >= 12;
}

/** Generate a short reason why this Best Pick was chosen */
function getBestPickReason(prediction: AIPrediction): string {
  const candidates = getBestPickCandidates(prediction);
  if (candidates.length < 2) return "";
  const best = candidates[0];
  const second = candidates[1];
  const edge = best.conf - second.conf;
  const probs = calculateGoalMarketProbs(prediction);

  if (best.label === "Over 2.5 Goals") {
    return `High goal output expected — ${probs.over25}% chance of 3+ goals. ${edge}pp edge over next market.`;
  }
  if (best.label === "Under 2.5 Goals") {
    return `Low-scoring profiles — ${probs.under25}% probability of fewer than 3 goals.`;
  }
  if (best.label === "BTTS Yes") {
    return `Both teams score regularly — ${probs.bttsYes}% chance both find the net.`;
  }
  if (best.label === "BTTS No") {
    return `At least one side struggles to score — ${probs.bttsNo}% clean sheet probability.`;
  }
  if (best.label === "Draw") {
    return `Evenly matched teams — ${best.conf}% draw probability.`;
  }

  const isHome = best.label.includes(prediction.home_team);
  const winPct = isHome ? prediction.home_win : prediction.away_win;
  return `Dominant ${winPct}% win probability — ${edge}pp clear of any other market.`;
}

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
}

export function MainMarketTab({ prediction, hasAccess, displayTier = "free" }: Props) {
  const markets = deriveMarkets(prediction);
  const picks = getBestPickCandidates(prediction);
  const bestPick = picks[0];
  const secondPick = picks[1];
  const bestProb = bestPick.conf;

  // Get strong secondary markets (≥60% and not the same as best pick)
  const strongSecondary = picks.filter((p, i) => i > 0 && p.conf >= 60).slice(0, 2);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* AI Guidance Badge + Risk */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-[10px] md:text-xs rounded-lg", getBadgeStyles(markets.guidance.badge))}>
          {getBadgeLabel(markets.guidance.badge)}
        </Badge>
        {prediction.risk_level && (
          <Badge className={cn("text-[10px] md:text-xs capitalize rounded-lg", getRiskLevelColor(prediction.risk_level))}>
            <Shield className="w-2.5 md:w-3 h-2.5 md:h-3 mr-0.5 md:mr-1" />
            {prediction.risk_level}
          </Badge>
        )}
      </div>

      {/* ===== BEST PICK — HERO SECTION ===== */}
      {hasAccess ? (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 md:p-4 space-y-2">
          {/* Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider">
                {displayTier === "free" ? "Safe Pick" : displayTier === "pro" ? "🔥 Best Pick" : "⭐ Best Pick"}
              </span>
            </div>
            {isValueBet(prediction) && displayTier !== "free" && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[8px] md:text-[9px] px-1.5 py-0.5 font-semibold rounded-lg">
                <Flame className="w-2.5 h-2.5 mr-0.5" />
                Value
              </Badge>
            )}
          </div>

          {/* Pick Name — Large */}
          <div className="flex items-center gap-2">
            {bestPick.icon}
            <span className="text-base md:text-lg font-bold text-foreground">
              {bestPick.label}
            </span>
          </div>

          {/* Probability — Very Prominent */}
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl md:text-3xl font-extrabold tabular-nums",
              bestProb >= 80 ? "text-green-400" : bestProb >= 70 ? "text-emerald-400" : bestProb >= 60 ? "text-amber-400" : "text-orange-400"
            )}>
              {bestProb}%
            </span>
            <span className="text-xs text-muted-foreground">probability</span>
          </div>

          {/* Probability bar */}
          <div className="h-2 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                bestProb >= 80 ? "bg-green-500" : bestProb >= 70 ? "bg-emerald-500" : bestProb >= 60 ? "bg-amber-500" : "bg-orange-500"
              )}
              style={{ width: `${Math.max(10, bestProb)}%` }}
            />
          </div>

          {/* Best Pick Reason — PRO and PREMIUM */}
          {displayTier !== "free" && (
            <p className="text-[10px] md:text-xs text-muted-foreground/80 leading-relaxed">
              {getBestPickReason(prediction)}
            </p>
          )}
        </div>
      ) : (
        /* Locked state */
        <div className="rounded-lg border border-border/50 bg-card/30 p-3 md:p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[10px] md:text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Best Pick
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-base md:text-lg font-bold text-white blur-sm select-none">? ? ?</div>
            <div className="text-2xl md:text-3xl font-extrabold text-white blur-sm select-none">??%</div>
          </div>
        </div>
      )}

      {/* ===== STRONG SECONDARY MARKETS — PRO/PREMIUM only ===== */}
      {hasAccess && displayTier !== "free" && strongSecondary.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] md:text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            Also strong
          </span>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2">
            {strongSecondary.map((pick, i) => (
              <div key={i} className="bg-card/40 border border-border/50 rounded-lg p-2 md:p-2.5 flex items-center gap-2">
                {pick.icon}
                <div className="min-w-0">
                  <div className="text-[10px] md:text-xs font-semibold text-foreground truncate">{pick.label}</div>
                  <div className={cn(
                    "text-sm md:text-base font-bold tabular-nums",
                    pick.conf >= 70 ? "text-green-400" : "text-amber-400"
                  )}>
                    {pick.conf}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 1X2 Probabilities — compact row ===== */}
      {hasAccess && (
        <div className="grid grid-cols-3 gap-1 pt-1">
          {[
            { label: prediction.home_team, pct: prediction.home_win, outcome: "home" as const },
            { label: "Draw", pct: prediction.draw, outcome: "draw" as const },
            { label: prediction.away_team, pct: prediction.away_win, outcome: "away" as const },
          ].map((item) => {
            const predictedOutcome = (() => {
              const p = (prediction.prediction || "").toLowerCase();
              if (p === "1" || p === "home") return "home";
              if (p === "2" || p === "away") return "away";
              return "draw";
            })();
            const isSelected = predictedOutcome === item.outcome;
            return (
              <div key={item.outcome} className={cn(
                "text-center py-1.5 rounded-md border",
                isSelected ? "border-primary/40 bg-primary/10" : "border-border/30 bg-card/20"
              )}>
                <div className="text-[8px] md:text-[9px] text-muted-foreground truncate px-1">{item.label}</div>
                <div className={cn(
                  "text-xs md:text-sm font-bold",
                  isSelected ? "text-primary" : "text-foreground/80"
                )}>
                  {item.pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
