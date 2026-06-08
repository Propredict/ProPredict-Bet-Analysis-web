import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Brain, Loader2, ChevronRight, Zap, Crown, Star, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { assignTiers, type Tier } from "@/components/ai-predictions/utils/tierAssignment";

type LockTier = "pro" | "premium" | null;

const getBelgradeDateKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const stableDailyScore = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function PredictionCard({
  prediction,
  onClick,
  lockTier = null,
  showWatchAd = false,
  isUnlocking = false,
  onWatchAd,
}: {
  prediction: any;
  onClick: () => void;
  lockTier?: LockTier;
  showWatchAd?: boolean;
  isUnlocking?: boolean;
  onWatchAd?: () => void;
}) {
  const maxProb = Math.max(prediction.home_win, prediction.draw, prediction.away_win);
  const favored = prediction.home_win === maxProb ? "1" : prediction.draw === maxProb ? "X" : "2";
  const confidence = prediction.confidence ?? 0;
  const labelMap: Record<string, string> = { "1": "Home Win", X: "Draw", "2": "Away Win" };
  const rawPred = String(prediction.prediction ?? "").trim();
  const displayPrediction = labelMap[rawPred] ?? rawPred;
  const locked = lockTier !== null;
  const isPremiumLock = lockTier === "premium";
  const ctaLabel = isPremiumLock ? "Premium · Tap to unlock" : "Pro · Tap to unlock";
  const ctaGradient = isPremiumLock
    ? "from-violet-600 to-fuchsia-500"
    : "from-amber-500 to-yellow-500";
  const CtaIcon = isPremiumLock ? Crown : Star;
  // On Android, Free users can watch an ad to unlock Pro AND non-premium picks.
  const watchAdMode = locked && showWatchAd && !isPremiumLock;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-md"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-primary to-primary/50" />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[60%]">
            {prediction.league || "League"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{prediction.match_time}</span>
        </div>

        <div className="space-y-2">
          {/* Teams — always visible, even when locked */}
          <p className="font-bold text-lg sm:text-xl text-foreground leading-tight text-center pt-1 pb-2">
            {prediction.home_team} vs {prediction.away_team}
          </p>

          {/* AI Prediction label — always visible */}
          <div className="flex items-center justify-center gap-2 py-1 border-y border-primary/20">
            <Star className="h-3 w-3 text-primary fill-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              AI Prediction
            </span>
            <Star className="h-3 w-3 text-primary fill-primary" />
          </div>

          {/* Prediction value — blurred when locked (CTA renders on top) */}
          <div className="flex items-center justify-center relative min-h-[2rem]">
            <span
              className={`text-base sm:text-lg font-extrabold text-white tracking-wide text-center ${
                locked ? "blur-md select-none pointer-events-none" : ""
              }`}
            >
              {displayPrediction}
            </span>
            {confidence >= 65 && !locked && (
              <div className={`absolute right-0 flex items-center gap-0.5 ${confidence >= 85 ? "text-fuchsia-400" : "text-amber-400"}`}>
                {confidence >= 85 ? <Crown className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                <span className="text-[9px] font-semibold">{confidence >= 85 ? "PREMIUM" : "PRO"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {locked && !watchAdMode && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${ctaGradient} shadow-lg`}>
            <CtaIcon className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{ctaLabel}</span>
          </div>
        </div>
      )}

      {watchAdMode && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center px-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatchAd?.();
            }}
            disabled={isUnlocking}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg hover:from-teal-600 hover:to-emerald-600 transition-colors disabled:opacity-70"
          >
            {isUnlocking ? (
              <Loader2 className="h-3 w-3 text-white animate-spin" />
            ) : (
              <Play className="h-3 w-3 text-white fill-current" />
            )}
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {isUnlocking ? "Loading…" : "Watch Ad to Unlock"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardAIPredictions() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");
  const { plan, canAccess } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const isFree = plan === "free";
  const isPro = plan === "basic";

  const getLockTier = (strength: number): LockTier => {
    // Premium plan unlocks everything
    if (!isFree && !isPro) return null;
    // Pro plan: only Premium picks (≥85%) are locked
    if (isPro) return strength >= 85 ? "premium" : null;
    // Free plan: Pro (65-84%) + Premium (≥85%) locked
    if (strength >= 85) return "premium";
    if (strength >= 65) return "pro";
    return null;
  };

  // Single source of truth: identical tier map as /ai-predictions.
  // Pick 2 matches per tier, daily-stable, ONLY from that tier's pool.
  const { tierMap } = useMemo(() => assignTiers(predictions), [predictions]);
  const tierOf = (p: any): Tier | null => tierMap.get(p.id) ?? null;

  const dailyPickKey = getBelgradeDateKey();

  const pickDaily = (pool: any[], count: number) =>
    [...pool]
      .sort((a, b) => {
        const aScore = stableDailyScore(`${dailyPickKey}:${a.id}:${a.home_team}:${a.away_team}`);
        const bScore = stableDailyScore(`${dailyPickKey}:${b.id}:${b.home_team}:${b.away_team}`);
        return aScore - bScore;
      })
      .slice(0, count);

  const freePicks = useMemo(
    () => pickDaily(predictions.filter((p) => tierOf(p) === "free"), 2),
    [dailyPickKey, tierMap, predictions],
  );
  const proPicks = useMemo(
    () => pickDaily(predictions.filter((p) => tierOf(p) === "pro"), 2),
    [dailyPickKey, tierMap, predictions],
  );
  const premiumPicks = useMemo(
    () => pickDaily(predictions.filter((p) => tierOf(p) === "premium"), 2),
    [dailyPickKey, tierMap, predictions],
  );

  const renderCard = (prediction: any, opts?: { forceWatchAd?: boolean }) => {
    // Lock based on the SAME tier classification as /ai-predictions.
    const tier = tierOf(prediction);
    const strength = tier === "premium" ? 90 : tier === "pro" ? 70 : 50;
    let baseTier = getLockTier(strength);
    // Android Free users: force the SECOND free pick into "Watch Ad to Unlock" mode
    // so they get a taste of one free pick and one ad-gated pick.
    if (opts?.forceWatchAd && isAndroidApp && isFree && tier === "free") {
      baseTier = "pro";
    }
    const lockTier: LockTier = canAccess("exclusive", "tip", prediction.id)
      ? baseTier === "premium" && !canAccess("premium", "tip", prediction.id)
        ? "premium"
        : null
      : baseTier;
    return (
      <PredictionCard
        key={prediction.id}
        prediction={prediction}
        onClick={() => navigate("/ai-predictions")}
        lockTier={lockTier}
        showWatchAd={isAndroidApp && isFree}
        isUnlocking={unlockingId === prediction.id}
        onWatchAd={() => {
          handleUnlock("tip", prediction.id, "exclusive");
        }}
      />
    );
  };

  // --- Unified layout (Web + Android): same Free / Pro / Premium sections, same picks ---
  return (
    <section className="space-y-5">
        {/* Section Header — centered bold title */}
        <div className="text-center space-y-1 pt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Daily Predictions made by AI
          </h2>
          <p className="text-[11px] text-muted-foreground">
            AI-powered match analysis{predictions.length > 0 ? ` · ${predictions.length} matches` : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* SECTION 1: FREE */}
            <TierSection
              title="Free Daily Picks"
              subtitle="Open access · everyday value"
              badgeIcon={Sparkles}
              badgeLabel="Free"
              tone="free"
              ctaLabel="See all Free Picks"
              onCta={() => navigate("/ai-predictions?tier=free")}
              empty="No free picks available today"
              picks={freePicks}
              renderCard={(p, idx) =>
                renderCard(p, { forceWatchAd: idx === 1 })
              }
            />

            {/* SECTION 2: PRO */}
            <TierSection
              title="Pro Picks"
              subtitle="Higher confidence · curated edge"
              badgeIcon={Star}
              badgeLabel="⭐ Pro"
              tone="pro"
              ctaLabel="See all Pro Picks"
              onCta={() => navigate("/ai-predictions?tier=pro")}
              empty="No Pro picks available today"
              picks={proPicks}
              renderCard={(p) => renderCard(p)}
            />

            {/* SECTION 3: PREMIUM */}
            <TierSection
              title="Premium Picks"
              subtitle="Best AI predictions · maximum edge"
              badgeIcon={Crown}
              badgeLabel="👑 Premium"
              tone="premium"
              ctaLabel="See all Premium Picks"
              onCta={() => navigate("/ai-predictions?tier=premium")}
              empty="No Premium picks available today"
              picks={premiumPicks}
              renderCard={(p) => renderCard(p)}
            />
          </>
        )}
    </section>
  );
}

/* =======================
   Tier Section (web)
======================= */

type Tone = "free" | "pro" | "premium";

const TONE_STYLES: Record<Tone, {
  border: string;
  bg: string;
  badge: string;
  text: string;
  cta: string;
}> = {
  free: {
    border: "border-primary/30",
    bg: "from-primary/10 via-primary/5 to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    text: "text-primary",
    cta: "from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600",
  },
  pro: {
    border: "border-amber-500/30",
    bg: "from-amber-500/10 via-amber-500/5 to-transparent",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-400",
    cta: "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600",
  },
  premium: {
    border: "border-fuchsia-500/30",
    bg: "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
    badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    text: "text-fuchsia-400",
    cta: "from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600",
  },
};

function TierSection({
  title,
  subtitle,
  badgeIcon: BadgeIcon,
  badgeLabel,
  tone,
  ctaLabel,
  onCta,
  empty,
  picks,
  renderCard,
}: {
  title: string;
  subtitle: string;
  badgeIcon: any;
  badgeLabel: string;
  tone: Tone;
  ctaLabel: string;
  onCta: () => void;
  empty: string;
  picks: any[];
  renderCard: (p: any, index: number) => JSX.Element;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={`rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.bg} p-3 sm:p-4 space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className={`gap-1 ${styles.badge} text-[10px] px-2 py-0.5`}>
              <BadgeIcon className="h-3 w-3" />
              {badgeLabel}
            </Badge>
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {picks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {picks.map((p, i) => renderCard(p, i))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-6 rounded-xl border border-border/40 bg-card/40">
          <BadgeIcon className={`h-5 w-5 ${styles.text} opacity-50`} />
          <p className="text-[11px] text-muted-foreground">{empty}</p>
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button
          size="sm"
          className={`px-5 group bg-gradient-to-r ${styles.cta} text-white text-xs border-0 rounded-full`}
          onClick={onCta}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
