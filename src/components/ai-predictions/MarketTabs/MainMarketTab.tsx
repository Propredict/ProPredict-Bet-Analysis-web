import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  calculateGoalMarketProbs,
  getBestPickType,
  type MarketType,
} from "../utils/marketDerivation";
import { Trophy, TrendingUp, Target, Zap, CheckCircle } from "lucide-react";

type PickCandidate = { label: string; conf: number; icon: React.ReactNode; type: MarketType };

const MARKET_META: Record<MarketType, { getLabel: (p: AIPrediction) => string; icon: React.ReactNode }> = {
  home_win: { getLabel: (p) => `${p.home_team} Win`, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
  away_win: { getLabel: (p) => `${p.away_team} Win`, icon: <Trophy className="w-4 h-4 text-amber-400" /> },
  draw: { getLabel: () => "Draw", icon: <Target className="w-4 h-4 text-blue-400" /> },
  over25: { getLabel: () => "Over 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  under25: { getLabel: () => "Under 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-orange-400" /> },
  btts_yes: { getLabel: () => "BTTS Yes", icon: <Zap className="w-4 h-4 text-yellow-400" /> },
  btts_no: { getLabel: () => "BTTS No", icon: <Zap className="w-4 h-4 text-red-400" /> },
};

const ONE_X_TWO: MarketType[] = ["home_win", "away_win", "draw"];
const GOAL_MARKETS: MarketType[] = ["over25", "under25"];

/** Get raw (display) probabilities for all markets */
function getAllRawProbs(prediction: AIPrediction): Record<MarketType, number> {
  const hw = prediction.home_win ?? 0;
  const aw = prediction.away_win ?? 0;
  const d = prediction.draw ?? 0;
  const probs = calculateGoalMarketProbs(prediction);

  const norm1 = hw > 0 ? Math.round(hw * (100 / (hw + Math.max(aw, d)))) : 0;
  const norm2 = aw > 0 ? Math.round(aw * (100 / (aw + Math.max(hw, d)))) : 0;
  const normX = d > 0 ? Math.round(d * (100 / (d + Math.max(hw, aw)))) : 0;

  return {
    home_win: norm1, away_win: norm2, draw: normX,
    over25: probs.over25, under25: probs.under25,
    btts_yes: probs.bttsYes, btts_no: probs.bttsNo,
  };
}

/** Determine the best pick across all markets */
function getBestPick(prediction: AIPrediction): PickCandidate {
  const bestType = getBestPickType(prediction);
  const rawProbs = getAllRawProbs(prediction);
  const meta = MARKET_META[bestType];
  return {
    label: meta.getLabel(prediction),
    conf: rawProbs[bestType],
    icon: meta.icon,
    type: bestType,
  };
}

/** Get 2 picks for Free tier: best 1X2 + best Over/Under 2.5 */
function getFreeDualPicks(prediction: AIPrediction): PickCandidate[] {
  const rawProbs = getAllRawProbs(prediction);

  // Best 1X2
  const best1x2Type = ONE_X_TWO.reduce((best, t) => rawProbs[t] > rawProbs[best] ? t : best, ONE_X_TWO[0]);
  const best1x2Meta = MARKET_META[best1x2Type];

  // Best goal market (Over or Under 2.5)
  const bestGoalType = GOAL_MARKETS.reduce((best, t) => rawProbs[t] > rawProbs[best] ? t : best, GOAL_MARKETS[0]);
  const bestGoalMeta = MARKET_META[bestGoalType];

  return [
    { label: best1x2Meta.getLabel(prediction), conf: rawProbs[best1x2Type], icon: best1x2Meta.icon, type: best1x2Type },
    { label: bestGoalMeta.getLabel(prediction), conf: rawProbs[bestGoalType], icon: bestGoalMeta.icon, type: bestGoalType },
  ];
}

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
}

export function MainMarketTab({ prediction, hasAccess, displayTier = "free" }: Props) {
  const bestPick = getBestPick(prediction);
  const freePicks = displayTier === "free" ? getFreeDualPicks(prediction) : [];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* ===== BEST PICKS — HERO SECTION ===== */}
      {hasAccess ? (
        displayTier === "free" ? (
          /* FREE TIER: Show 2 picks side by side — 1X2 + Over/Under */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider">
                AI Picks
              </span>
              <Badge className="ml-auto text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                FREE
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {freePicks.map((pick, i) => {
                const prob = pick.conf;
                return (
                  <div
                    key={pick.type}
                    className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-2.5 md:p-3 space-y-1.5"
                  >
                    <div className="text-[8px] md:text-[9px] text-muted-foreground/70 uppercase tracking-wider font-medium">
                      {i === 0 ? "Match Result" : "Goals"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pick.icon}
                      <span className="text-xs md:text-sm font-bold text-foreground leading-tight">
                        {pick.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn(
                        "text-lg md:text-xl font-extrabold tabular-nums",
                        prob >= 80 ? "text-green-400" : prob >= 70 ? "text-emerald-400" : prob >= 60 ? "text-amber-400" : "text-orange-400"
                      )}>
                        {prob}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          prob >= 80 ? "bg-green-500" : prob >= 70 ? "bg-emerald-500" : prob >= 60 ? "bg-amber-500" : "bg-orange-500"
                        )}
                        style={{ width: `${Math.max(10, prob)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Predicted Score */}
            {prediction.predicted_score && (
              <p className="text-[10px] md:text-xs text-muted-foreground/80">
                Predicted Score: <span className="font-semibold text-foreground">{prediction.predicted_score}</span>
              </p>
            )}
          </div>
        ) : (
          /* PRO / PREMIUM: Single best pick hero */
          <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 md:p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider">
                Best Pick
              </span>
              <Badge className={cn(
                "ml-auto text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-lg",
                displayTier === "premium" 
                  ? "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" 
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              )}>
                {displayTier === "premium" ? "PREMIUM" : "PRO"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {bestPick.icon}
              <span className="text-base md:text-lg font-bold text-foreground">
                {bestPick.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-2xl md:text-3xl font-extrabold tabular-nums",
                bestPick.conf >= 80 ? "text-green-400" : bestPick.conf >= 70 ? "text-emerald-400" : bestPick.conf >= 60 ? "text-amber-400" : "text-orange-400"
              )}>
                {bestPick.conf}%
              </span>
              <span className="text-xs text-muted-foreground">probability</span>
            </div>
            <div className="h-2 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  bestPick.conf >= 80 ? "bg-green-500" : bestPick.conf >= 70 ? "bg-emerald-500" : bestPick.conf >= 60 ? "bg-amber-500" : "bg-orange-500"
                )}
                style={{ width: `${Math.max(10, bestPick.conf)}%` }}
              />
            </div>
            {prediction.predicted_score && (
              <p className="text-[10px] md:text-xs text-muted-foreground/80">
                Predicted Score: <span className="font-semibold text-foreground">{prediction.predicted_score}</span>
              </p>
            )}
          </div>
        )
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
