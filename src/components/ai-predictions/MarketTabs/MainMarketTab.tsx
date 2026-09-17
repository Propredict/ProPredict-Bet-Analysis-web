import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  calculateGoalMarketProbs,
  getBestPickType,
  getRawProbMap,
  getBestEligibleProbability,
  getPickConfidence,
  type MarketType,
} from "../utils/marketDerivation";
import { Trophy, TrendingUp, Target, Zap, CheckCircle, Flame, TrendingDown, Activity, DollarSign, Shield, Sparkles, Lock, ShieldCheck, BarChart3 } from "lucide-react";
import { TicketTeamCrest } from "@/components/tickets/TicketTeamCrest";
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
  home_win: { getLabel: (p) => `${p.home_team} Win`, icon: <Trophy className="w-4 h-4 text-blue-400" /> },
  away_win: { getLabel: (p) => `${p.away_team} Win`, icon: <Trophy className="w-4 h-4 text-blue-400" /> },
  draw: { getLabel: () => "Draw", icon: <Target className="w-4 h-4 text-blue-400" /> },
  dc_1x: { getLabel: (p) => `${p.home_team} or Draw (1X)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  dc_x2: { getLabel: (p) => `Draw or ${p.away_team} (X2)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  dc_12: { getLabel: (p) => `${p.home_team} or ${p.away_team} (12)`, icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  over15: { getLabel: () => "Over 1.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  over25: { getLabel: () => "Over 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  over35: { getLabel: () => "Over 3.5 Goals", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  under25: { getLabel: () => "Under 2.5 Goals", icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
  under35: { getLabel: () => "Under 3.5 Goals", icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
  btts_yes: { getLabel: () => "BTTS Yes", icon: <Zap className="w-4 h-4 text-blue-400" /> },
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
 * Exported so the card header strip shows the exact same pick + confidence.
 */
export function getAIBestPick(prediction: AIPrediction): PickCandidate {
  const bestType = getBestPickType(prediction);
  const meta = MARKET_META[bestType];
  const strongest = getBestEligibleProbability(prediction);
  // Premium band: the headline shows the informative pick (e.g. "Panathinaikos
  // to Win") while AI Confidence keeps the card's strongest analysed value.
  // Exception: pure 1X2 picks always show their OWN probability — displaying
  // "Home Win 90%" when the win is 74% (the 90% comes from 1X) is misleading.
  const own = getPickConfidence(prediction, bestType);
  const conf = ONE_X_TWO.includes(bestType)
    ? own
    : strongest >= 80 ? Math.max(own, strongest) : own;
  return { label: meta.getLabel(prediction), conf, icon: meta.icon, type: bestType };
}


/**
 * AI Confidence must match the pick that is actually displayed. Using the
 * card's strongest market instead made every Free/Pro card read the same
 * value (usually Over 1.5 ≈ 71%), even when the headline pick differed.
 */
function getStrongestConfidencePick(prediction: AIPrediction): PickCandidate {
  return getAIBestPick(prediction);
}


interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
  /** When true, the big "Best Pick" box is skipped — the card header strip already shows it. */
  hidePickBox?: boolean;
  /** Team crests resolved by the card header — shown inside the 1X2 cells. */
  homeLogo?: string | null;
  awayLogo?: string | null;
}

export function MainMarketTab({ prediction, hasAccess, displayTier = "free", hidePickBox = false, homeLogo = null, awayLogo = null }: Props) {
  const pick = getStrongestConfidencePick(prediction);


  const parsedTags = parseStructuredTags(prediction.key_factors ?? null);
  const allProbs = getAllRawProbs(prediction);


  return (
    <div className="space-y-3 md:space-y-4">
      {!hidePickBox && (
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
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                <span className="text-sm md:text-base font-bold text-blue-400 uppercase tracking-wider">
                  AI High Confidence Pick
                </span>
              </>
            )}
            <Badge className={cn(
              "absolute right-0 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-lg",
              displayTier === "premium" 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                : displayTier === "pro" 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-green-500/20 text-green-400 border-green-500/30"
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
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <Target className="w-2.5 h-2.5" />
                MEDIUM
              </Badge>
            ) : (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded gap-0.5">
                <TrendingDown className="w-2.5 h-2.5" />
                RISKY
              </Badge>
            )}
          </div>

          {/* Premium Edge Indicators */}
          {displayTier === "premium" && pick.conf >= 75 && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] md:text-[10px] font-bold text-blue-400">
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
              pick.conf >= 80 ? "text-green-400" : pick.conf >= 70 ? "text-green-400" : pick.conf >= 60 ? "text-blue-400" : "text-blue-400"
            )}>
              {pick.conf}%
            </span>
          </div>

          {/* Animated gradient confidence bar — color reflects market category (Over/BTTS/DC/Under) */}
          {(() => {
            const tokens = getMarketColors(pick.label);
            return (
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
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
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  SAFE
                </Badge>
              )}
              {parsedTags.tempo && (
                <Badge className={cn(
                  "text-[7px] md:text-[8px] px-1.5 py-0.5 rounded gap-0.5",
                  parsedTags.tempo === "HIGH" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  parsedTags.tempo === "LOW" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  "bg-blue-500/20 text-blue-400 border-blue-500/30"
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

        </div>
      )}

      {/* ===== Match Result (1X2) — reference design: crests, big %, fair odds, bars ===== */}
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-2.5 md:p-3.5 space-y-2.5 md:space-y-3">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1.5 text-primary">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm md:text-base font-extrabold text-foreground">Match Result (1X2)</span>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full gap-1 font-bold">
            <Sparkles className="h-3 w-3" />
            AI Analysis
          </Badge>
        </div>

        <div className="flex gap-1.5 md:gap-2 items-stretch">
          {[
            { label: prediction.home_team, short: "1", pct: prediction.home_win ?? 0, outcome: "home" as const, logo: homeLogo },
            { label: "Draw", short: "X", pct: prediction.draw ?? 0, outcome: "draw" as const, logo: null },
            { label: prediction.away_team, short: "2", pct: prediction.away_win ?? 0, outcome: "away" as const, logo: awayLogo },
          ].map((item) => {
            // Highlight the outcome with the highest probability.
            const predictedOutcome = (() => {
              const h = prediction.home_win ?? 0;
              const d = prediction.draw ?? 0;
              const a = prediction.away_win ?? 0;
              if (h >= d && h >= a) return "home";
              if (a >= d && a >= h) return "away";
              return "draw";
            })();
            const isSelected = predictedOutcome === item.outcome;
            const fairOdds = item.pct > 0 ? (100 / item.pct).toFixed(2) : "—";

            return (
              <div
                key={item.outcome}
                className={cn(
                  "min-w-0 text-center rounded-xl transition-all",
                  isSelected
                    ? "flex-[1.35] border-2 border-success bg-success/10 px-2 py-3 md:py-4 shadow-md shadow-success/15"
                    : "flex-1 border border-border/40 bg-card px-1 py-2 md:py-2.5"
                )}
              >
                {/* Crest / draw symbol */}
                <div className={cn("mx-auto flex items-center justify-center", isSelected ? "h-10 w-10 md:h-12 md:w-12" : "h-7 w-7 md:h-8 md:w-8")}>
                  {item.outcome === "draw" ? (
                    <span className={cn(
                      "flex items-center justify-center rounded-full bg-secondary text-muted-foreground font-black",
                      isSelected ? "h-9 w-9 text-base md:h-11 md:w-11 md:text-lg" : "h-6 w-6 text-xs md:h-7 md:w-7"
                    )}>✕</span>
                  ) : (
                    <TicketTeamCrest name={item.label} logo={item.logo} size={isSelected ? "lg" : "md"} />
                  )}
                </div>

                {/* Label */}
                <div
                  className={cn(
                    "mt-1 font-bold text-muted-foreground truncate px-0.5",
                    isSelected ? "text-[11px] md:text-sm" : "text-[9px] md:text-[11px]",
                  )}
                  title={`${item.short} - ${item.label}`}
                >
                  {item.short} - {item.label}
                </div>

                {/* Probability + fair odds */}
                <div className={cn("flex items-baseline justify-center gap-1.5", isSelected ? "mt-1" : "mt-0.5")}>
                  <span className={cn(
                    "tabular-nums leading-none",
                    isSelected ? "text-2xl md:text-4xl font-black" : "text-base md:text-xl font-extrabold",
                    !hasAccess && "blur-[5px] select-none",
                    isSelected ? "text-success" : "text-foreground/80"
                  )}>
                    {item.pct}%
                  </span>
                  <span className={cn(
                    "rounded-md bg-secondary px-1.5 py-0.5 tabular-nums font-bold text-muted-foreground",
                    isSelected ? "text-[10px] md:text-xs" : "text-[8px] md:text-[10px]",
                    !hasAccess && "blur-[5px] select-none"
                  )}>
                    {fairOdds}
                  </span>
                </div>

                {/* Probability bar */}
                <div className={cn("mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden mx-1", !isSelected && "h-1")}>
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", isSelected ? "bg-success" : "bg-primary/60")}
                    style={{ width: `${Math.max(6, item.pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] md:text-[10px] text-muted-foreground px-0.5">Odds shown are fair odds from our model (100 ÷ probability).</p>
      </div>
    </div>
  );
}
