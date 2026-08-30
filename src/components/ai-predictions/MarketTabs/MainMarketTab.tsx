import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  calculateGoalMarketProbs,
  getBestPickType,
  getRawProbMap,
  getBestEligibleProbability,
  getConsistentSafeCombo,
  getConsistentTopCorrectScores,
  getDerivedPredictedScore,
  getRecommendedScoreConstraints,
  type MarketType,
} from "../utils/marketDerivation";
import { Trophy, TrendingUp, Target, Zap, CheckCircle, Crosshair, Flame, TrendingDown, Activity, DollarSign, Shield, Sparkles, Lock, ShieldCheck } from "lucide-react";
import { getMarketColors, classifyMarket } from "../utils/marketColors";

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
  dc_1x: { getLabel: (p) => `${p.home_team} or Draw (1X)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  dc_x2: { getLabel: (p) => `Draw or ${p.away_team} (X2)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  dc_12: { getLabel: (p) => `${p.home_team} or ${p.away_team} (12)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  over15: { getLabel: () => "Over 1.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  over25: { getLabel: () => "Over 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  over35: { getLabel: () => "Over 3.5 Goals", icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
  under25: { getLabel: () => "Under 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-orange-400" /> },
  under35: { getLabel: () => "Under 3.5 Goals", icon: <TrendingUp className="w-4 h-4 text-orange-400" /> },
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
    dc_1x: hw + d, dc_x2: d + aw, dc_12: hw + aw,
    over15: probs.over15, over25: probs.over25, over35: probs.over35,
    under25: probs.under25, under35: probs.under35,
    btts_yes: probs.bttsYes, btts_no: probs.bttsNo,
  };
}

/**
 * Displayed AI Confidence ALWAYS equals the probability of the pick that is
 * shown as Best Pick (e.g. Under 2.5 at 70% -> AI Confidence 70%).
 * Uses the canonical probability map so Main matches the market tabs exactly.
 */
function getBestPick(prediction: AIPrediction): PickCandidate {
  const bestType = getBestPickType(prediction);
  const probs = getRawProbMap(prediction);
  const meta = MARKET_META[bestType];
  const strongest = getBestEligibleProbability(prediction);
  // Premium band: the headline shows the informative pick (e.g. "Panathinaikos
  // to Win") while AI Confidence keeps the card's strongest analysed value.
  const conf = strongest >= 80 ? Math.max(probs[bestType], strongest) : probs[bestType];
  return { label: meta.getLabel(prediction), conf, icon: meta.icon, type: bestType };
}


/**
 * AI Confidence must match the pick that is actually displayed. Using the
 * card's strongest market instead made every Free/Pro card read the same
 * value (usually Over 1.5 ≈ 71%), even when the headline pick differed.
 */
function getStrongestConfidencePick(prediction: AIPrediction): PickCandidate {
  return getBestPick(prediction);
}


interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
}

export function MainMarketTab({ prediction, hasAccess, displayTier = "free" }: Props) {
  const pick = getStrongestConfidencePick(prediction);


  const parsedTags = parseStructuredTags(prediction.key_factors ?? null);
  const safeCombo = getConsistentSafeCombo(prediction, parsedTags.safeCombo);
  const scoreConstraints = getRecommendedScoreConstraints(prediction);
  const allProbs = getAllRawProbs(prediction);
  // Top correct scores now shown on every tier (Free/Pro/Premium) — same as Premium card
  const topScores = getConsistentTopCorrectScores(
    prediction,
    { ...scoreConstraints, extraMarketTypes: [scoreConstraints.marketType, pick.type], marketType: pick.type, safeCombo },
    3
  );


  return (
    <div className="space-y-3 md:space-y-4">
      {
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 md:p-4 space-y-2">
          {/* Label */}
          <div className="flex items-center justify-center gap-1.5 relative">
            {hasAccess ? (
              <>
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-sm md:text-base font-bold text-primary uppercase tracking-wider">
                  Best Pick
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-fuchsia-400" />
                <span className="text-sm md:text-base font-bold text-fuchsia-400 uppercase tracking-wider">
                  AI High Confidence Pick
                </span>
              </>
            )}
            <Badge className={cn(
              "absolute right-0 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-lg",
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
          <div className="flex items-center justify-center gap-2 relative">
            {pick.icon}
            <span className={cn(
              "text-xl md:text-2xl font-extrabold text-foreground text-center",
              !hasAccess && "blur-[5px] select-none"
            )}>
              {pick.label}
            </span>
            {/* Market category color chip — quick visual scan (Over=blue, BTTS=green, DC=purple, Under=orange) */}
            {(() => {
              if (!hasAccess) return null;
              const cat = classifyMarket(pick.label);
              if (cat === "other" || cat === "1x2") return null;
              const tokens = getMarketColors(pick.label);
              return (
                <Badge className={cn("absolute right-0 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded font-bold border", tokens.chipClass)}>
                  {tokens.shortLabel}
                </Badge>
              );
            })()}
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

          {/* AI Confidence */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">🧠 AI Confidence</span>
            <span className={cn(
              "text-2xl md:text-3xl font-extrabold tabular-nums",
              !hasAccess && "blur-[5px] select-none",
              pick.conf >= 80 ? "text-green-400" : pick.conf >= 70 ? "text-emerald-400" : pick.conf >= 60 ? "text-amber-400" : "text-orange-400"
            )}>
              {pick.conf}%
            </span>
          </div>

          {/* Animated gradient confidence bar — color reflects market category (Over/BTTS/DC/Under) */}
          {(() => {
            const tokens = getMarketColors(pick.label);
            return (
              <div className="relative h-2 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "relative h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                    tokens.barGradient
                  )}
                  style={{ width: `${Math.max(10, pick.conf)}%` }}
                >
                  {/* Shimmer overlay */}
                  <div
                    className="absolute inset-0 rounded-full animate-shimmer-bar"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
              </div>
            );
          })()}

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

          {/* SAFE COMBO — shown on all tiers for users with access. */}
          {parsedTags.safeCombo && hasAccess && (
            <div className="flex flex-col items-center justify-center gap-1 pt-2 pb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <span className="text-sm md:text-base font-semibold text-fuchsia-400 uppercase tracking-wider">Risk Combo</span>
              </div>
              <span className="text-lg md:text-xl font-bold text-foreground text-center">{parsedTags.safeCombo}</span>
            </div>
          )}
          {parsedTags.safeCombo && !hasAccess && (
            <div className="flex items-center gap-1.5 pt-1 pb-0.5">
              <Sparkles className="w-3 h-3 text-fuchsia-400" />
              <span className="text-[9px] md:text-[10px] font-semibold text-fuchsia-400 uppercase tracking-wider">
                High Value Insight
              </span>
              <Badge className="ml-1 bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                {displayTier === "premium" ? "PREMIUM" : "PRO"}
              </Badge>
            </div>
          )}

          {/* Predicted Score removed — Top Correct Scores below already shows score predictions */}
        </div>
      }

      {/* ===== 1X2 Probabilities — compact row ===== */}
      <div className="grid grid-cols-3 gap-1 pt-1">
          {[
            { label: prediction.home_team, pct: prediction.home_win, outcome: "home" as const },
            { label: "Draw", pct: prediction.draw, outcome: "draw" as const },
            { label: prediction.away_team, pct: prediction.away_win, outcome: "away" as const },
          ].map((item) => {
            // Highlight the outcome with the highest probability. The previous
            // string matching on `prediction.prediction` mis-flagged nearly every
            // card as "away" even when the home side was the clear favourite.
            const predictedOutcome = (() => {
              const h = prediction.home_win ?? 0;
              const d = prediction.draw ?? 0;
              const a = prediction.away_win ?? 0;
              if (h >= d && h >= a) return "home";
              if (a >= d && a >= h) return "away";
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
                  !hasAccess && "blur-[5px] select-none",
                  isSelected ? "text-primary" : "text-foreground/80"
                )}>
                  {item.pct}%
                </div>
              </div>
            );
          })}
      </div>

      {/* ===== Top Correct Scores — all tiers ===== */}
      {topScores.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Crosshair className={cn("w-3 h-3", displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400")} />
            <span className={cn(
              "text-[10px] md:text-xs font-semibold uppercase tracking-wider",
              displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400"
            )}>
              Top Correct Scores
            </span>
            <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium">
              (1 of {Math.max(topScores.length, 1)})
            </span>
          </div>
          <div className={cn("grid gap-1.5", topScores.length === 1 ? "grid-cols-1" : topScores.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
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
                <div className={cn(
                  "text-sm md:text-base font-bold text-foreground",
                  !hasAccess && "blur-[5px] select-none"
                )}>{s.score}</div>
                <div className={cn(
                  "text-[9px] md:text-[10px] font-medium",
                  !hasAccess && "blur-[5px] select-none",
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
