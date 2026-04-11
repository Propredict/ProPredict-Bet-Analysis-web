import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  calculateGoalMarketProbs,
  getBestPickType,
  getConsistentTopCorrectScores,
  getDerivedPredictedScore,
  getRecommendedScoreConstraints,
  type MarketType,
} from "../utils/marketDerivation";
import { Trophy, TrendingUp, Target, Zap, CheckCircle, Crosshair, Flame, TrendingDown, Activity, DollarSign, Shield, Sparkles, Lock } from "lucide-react";

/**
 * Parse structured tags from key_factors.
 * Tags are stored as "[TAG]TAG_NAME" in the key_factors array.
 */
function parseStructuredTags(keyFactors: string[] | null): {
  tags: string[];
  safeCombo: string | null;
  tempo: "HIGH" | "MEDIUM" | "LOW" | null;
  isUltra: boolean;
  isSafe: boolean;
  hasValue: boolean;
  hasStrongValue: boolean;
  marketStrong: boolean;
  marketAligned: boolean;
} {
  const result = {
    tags: [] as string[],
    safeCombo: null as string | null,
    tempo: null as "HIGH" | "MEDIUM" | "LOW" | null,
    isUltra: false,
    isSafe: false,
    hasValue: false,
    hasStrongValue: false,
    marketStrong: false,
    marketAligned: false,
  };
  if (!keyFactors) return result;

  for (const f of keyFactors) {
    if (!f.startsWith("[TAG]")) continue;
    const tag = f.replace("[TAG]", "");
    result.tags.push(tag);

    if (tag === "ULTRA_STRONG") result.isUltra = true;
    if (tag === "SAFE") result.isSafe = true;
    if (tag === "VALUE") result.hasValue = true;
    if (tag === "STRONG_VALUE") { result.hasStrongValue = true; result.hasValue = true; }
    if (tag === "HIGH_TEMPO") result.tempo = "HIGH";
    if (tag === "MEDIUM_TEMPO") result.tempo = "MEDIUM";
    if (tag === "LOW_TEMPO") result.tempo = "LOW";
    if (tag === "MARKET:STRONG") result.marketStrong = true;
    if (tag === "MARKET:ALIGNED") result.marketAligned = true;
    if (tag.startsWith("SAFE_COMBO:")) result.safeCombo = tag.replace("SAFE_COMBO:", "");
  }
  return result;
}

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

/** Get raw (display) probabilities for all markets */
function getAllRawProbs(prediction: AIPrediction): Record<MarketType, number> {
  let hw = Math.max(0, prediction.home_win ?? 0);
  let aw = Math.max(0, prediction.away_win ?? 0);
  let d = Math.max(0, prediction.draw ?? 0);
  const probs = calculateGoalMarketProbs(prediction);

  const total = hw + aw + d;
  if (total > 0) {
    hw = Math.round((hw / total) * 100);
    aw = Math.round((aw / total) * 100);
    d = 100 - hw - aw;
  } else {
    hw = 33;
    d = 34;
    aw = 33;
  }

  return {
    home_win: hw, away_win: aw, draw: d,
    over25: probs.over25, under25: probs.under25,
    btts_yes: probs.bttsYes, btts_no: probs.bttsNo,
  };
}

/** Best pick across all markets (Pro/Premium) */
function getBestPick(prediction: AIPrediction): PickCandidate {
  const bestType = getBestPickType(prediction);
  const rawProbs = getAllRawProbs(prediction);
  const meta = MARKET_META[bestType];
  return { label: meta.getLabel(prediction), conf: rawProbs[bestType], icon: meta.icon, type: bestType };
}

/** 
 * Free tier: pick the best market across ALL types (not just 1X2).
 * This ensures diverse picks like Draw, BTTS, Under 2.5 instead of always Home/Away Win.
 */
function getFreePick(prediction: AIPrediction): PickCandidate {
  const bestType = getBestPickType(prediction);
  const rawProbs = getAllRawProbs(prediction);
  const meta = MARKET_META[bestType];
  // Use the actual market probability for display
  const displayConf = rawProbs[bestType] || prediction.confidence || 50;
  return { label: meta.getLabel(prediction), conf: displayConf, icon: meta.icon, type: bestType };
}

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
}

export function MainMarketTab({ prediction, hasAccess, displayTier = "free" }: Props) {
  const pick = displayTier === "free" ? getFreePick(prediction) : getBestPick(prediction);
  const parsedTags = parseStructuredTags(prediction.key_factors ?? null);
  const scoreConstraints = getRecommendedScoreConstraints(prediction);
  const topScores = displayTier === "premium"
    ? getConsistentTopCorrectScores(prediction, { ...scoreConstraints, marketType: pick.type, safeCombo: parsedTags.safeCombo }, 3)
    : displayTier === "pro"
    ? getConsistentTopCorrectScores(prediction, { ...scoreConstraints, marketType: pick.type }, 1)
    : [];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* ===== BEST PICK — HERO SECTION ===== */}
      {hasAccess ? (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 md:p-4 space-y-2">
          {/* Label */}
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider">
              Best Pick
            </span>
            <Badge className={cn(
              "ml-auto text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-lg",
              displayTier === "premium" 
                ? "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30" 
                : displayTier === "pro" 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            )}>
              {displayTier === "premium" ? "PREMIUM" : displayTier === "pro" ? "PRO" : "FREE"}
            </Badge>
          </div>

          {/* Pick Name */}
          <div className="flex items-center gap-2">
            {pick.icon}
            <span className="text-base md:text-lg font-bold text-foreground">
              {pick.label}
            </span>
          </div>

          {/* Confidence Label */}
          <div className="flex items-center gap-2 mb-0.5">
            {pick.conf >= 80 ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5 animate-pulse">
                <Flame className="w-2.5 h-2.5" />
                HIGH CONFIDENCE
              </Badge>
            ) : pick.conf >= 65 ? (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <Target className="w-2.5 h-2.5" />
                MEDIUM
              </Badge>
            ) : (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <TrendingDown className="w-2.5 h-2.5" />
                RISKY
              </Badge>
            )}
          </div>

          {/* Premium Edge Indicators */}
          {displayTier === "premium" && pick.conf >= 75 && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-fuchsia-400" />
              <span className="text-[9px] md:text-[10px] font-bold text-fuchsia-400">
                {pick.conf >= 85 ? "💎 AI EDGE DETECTED" : pick.conf >= 80 ? "🔥 Top Value Pick" : "📊 Market Mismatch Found"}
              </span>
            </div>
          )}

          {/* Probability */}
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-2xl md:text-3xl font-extrabold tabular-nums",
              pick.conf >= 80 ? "text-green-400" : pick.conf >= 70 ? "text-emerald-400" : pick.conf >= 60 ? "text-amber-400" : "text-orange-400"
            )}>
              {pick.conf}%
            </span>
            <span className="text-xs text-muted-foreground">probability</span>
          </div>

          {/* Probability bar */}
          <div className="h-2 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pick.conf >= 80 ? "bg-green-500" : pick.conf >= 70 ? "bg-emerald-500" : pick.conf >= 60 ? "bg-amber-500" : "bg-orange-500"
              )}
              style={{ width: `${Math.max(10, pick.conf)}%` }}
            />
          </div>

          {/* AI Tags — badges for tempo, value, market signal, safe combo — PREMIUM only */}
          {displayTier === "premium" && parsedTags.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {parsedTags.isUltra && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <Flame className="w-2.5 h-2.5" />
                  ULTRA STRONG
                </Badge>
              )}
              {parsedTags.isSafe && !parsedTags.isUltra && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  SAFE
                </Badge>
              )}
              {parsedTags.tempo && (
                <Badge className={cn(
                  "text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5",
                  parsedTags.tempo === "HIGH" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                  parsedTags.tempo === "LOW" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                )}>
                  <Activity className="w-2.5 h-2.5" />
                  {parsedTags.tempo}
                </Badge>
              )}
              {parsedTags.hasStrongValue && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />
                  STRONG VALUE
                </Badge>
              )}
              {parsedTags.hasValue && !parsedTags.hasStrongValue && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />
                  VALUE
                </Badge>
              )}
              {parsedTags.marketStrong && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  MARKET STRONG
                </Badge>
              )}
            </div>
          )}

          {/* SAFE COMBO — Premium only */}
          {parsedTags.safeCombo && displayTier === "premium" && (
            <div className="flex items-center gap-1.5 pt-1 pb-0.5">
              <Sparkles className="w-3 h-3 text-fuchsia-400" />
              <span className="text-[9px] md:text-[10px] font-semibold text-fuchsia-400">SAFE COMBO:</span>
              <span className="text-[9px] md:text-[10px] font-bold text-foreground">{parsedTags.safeCombo}</span>
            </div>
          )}

          {/* Predicted Score — aligned with Best Pick + Goals + BTTS + SAFE COMBO */}
          {(() => {
            const derivedScore = getDerivedPredictedScore(prediction, {
              ...scoreConstraints,
              marketType: pick.type,
              safeCombo: displayTier === "premium" ? parsedTags.safeCombo : null,
            });
            return (
              <p className="text-[10px] md:text-xs text-muted-foreground/80">
                Predicted Score: <span className="font-semibold text-foreground">{derivedScore}</span>
              </p>
            );
          })()}
        </div>
      ) : (
        /* Locked state — FOMO teaser */
        <div className="rounded-lg border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-card/50 to-fuchsia-500/5 p-3 md:p-4 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent pointer-events-none" />
          
          <div className="relative space-y-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="text-[10px] md:text-xs font-bold text-fuchsia-400 uppercase tracking-wider">
                🔒 AI High Confidence Pick
              </span>
            </div>
            
            {/* Teaser — show confidence but NOT the team */}
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-extrabold text-fuchsia-400">
                Win probability: {Math.max(pick.conf, 75)}%
              </span>
            </div>
            
            {pick.conf >= 80 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <Flame className="w-2.5 h-2.5" />
                HIGH CONFIDENCE
              </Badge>
            )}
            
            <div className="flex items-end justify-between pt-1">
              <div className="text-base md:text-lg font-bold text-white/20 blur-md select-none pointer-events-none">Hidden Team Win</div>
            </div>
            
            <p className="text-[9px] md:text-[10px] text-muted-foreground/80">
              Unlock full prediction to see team, score & analysis 👇
            </p>
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

      {/* ===== Top Correct Scores — Pro (top 2) & Premium (top 3) ===== */}
      {hasAccess && displayTier !== "free" && topScores.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Crosshair className={cn("w-3 h-3", displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400")} />
            <span className={cn(
              "text-[10px] md:text-xs font-semibold uppercase tracking-wider",
              displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400"
            )}>
              Top Correct Scores
            </span>
          </div>
          <div className={cn("grid gap-1.5", topScores.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {topScores.map((s, i) => (
              <div
                key={s.score}
                className={cn(
                  "text-center py-2 rounded-md border",
                  i === 0
                    ? displayTier === "premium" 
                      ? "border-fuchsia-500/40 bg-fuchsia-500/10" 
                      : "border-amber-500/40 bg-amber-500/10"
                    : "border-border/30 bg-card/20"
                )}
              >
                <div className="text-sm md:text-base font-bold text-foreground">{s.score}</div>
                <div className={cn(
                  "text-[9px] md:text-[10px] font-medium",
                  i === 0 
                    ? displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400"
                    : "text-muted-foreground"
                )}>
                  {s.probability}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
