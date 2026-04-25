import { useNavigate } from "react-router-dom";
import { Brain, Loader2, ChevronRight, Zap, Crown, Star, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";

type LockTier = "pro" | "premium" | null;

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

        <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1">
          {prediction.home_team} vs {prediction.away_team}
        </p>

        <div className={`flex items-center gap-1 ${locked ? "blur-md select-none pointer-events-none" : ""}`}>
          {[
            { label: "1", value: prediction.home_win, active: favored === "1" },
            { label: "X", value: prediction.draw, active: favored === "X" },
            { label: "2", value: prediction.away_win, active: favored === "2" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-colors ${
                item.active
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              <span className="block text-[9px] font-normal opacity-70">{item.label}</span>
              {item.value}%
            </div>
          ))}
        </div>

        <div className={`space-y-2 ${locked ? "blur-md select-none pointer-events-none" : ""}`}>
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 text-[10px] px-2">
              {prediction.prediction}
            </Badge>
            {confidence >= 75 && (
              <div className="flex items-center gap-0.5 text-accent">
                <Zap className="h-3 w-3" />
                <span className="text-[9px] font-semibold">PREMIUM</span>
              </div>
            )}
          </div>
          <ConfidenceBar value={confidence} />
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

  const getLockTier = (conf: number): LockTier => {
    // Premium plan unlocks everything
    if (!isFree && !isPro) return null;
    // Pro plan: only Premium picks (≥78%) are locked
    if (isPro) return conf >= 78 ? "premium" : null;
    // Free plan: Pro (65-77%) + Premium (≥78%) locked
    if (conf >= 78) return "premium";
    if (conf >= 65) return "pro";
    return null;
  };

  // Tier classification (independent of user plan) — used to bucket predictions
  const classifyTier = (conf: number): "free" | "pro" | "premium" => {
    if (conf >= 78) return "premium";
    if (conf >= 65) return "pro";
    return "free";
  };

  const sorted = [...predictions]
    .filter((p) => (p.confidence ?? 0) >= 50)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  const freePicks = sorted.filter((p) => classifyTier(p.confidence ?? 0) === "free").slice(0, 2);
  const proPicks = sorted.filter((p) => classifyTier(p.confidence ?? 0) === "pro").slice(0, 2);
  const premiumPicks = sorted.filter((p) => classifyTier(p.confidence ?? 0) === "premium").slice(0, 2);

  const displayedPredictions = sorted.slice(0, 3);

  const renderCard = (prediction: any) => {
    const conf = prediction.confidence ?? 0;
    const baseTier = getLockTier(conf);
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
          const tier = getLockTier(conf);
          if (tier === "pro") {
            handleUnlock("tip", prediction.id, "exclusive");
          }
        }}
      />
    );
  };

  // --- WEB: vertical sections (Free / Pro / Premium) ---
  if (!isAndroidApp) {
    return (
      <section className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/20">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Predictions</h2>
              <p className="text-[10px] text-muted-foreground">AI-powered match analysis</p>
            </div>
          </div>
          {predictions.length > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
              {predictions.length} matches
            </Badge>
          )}
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
              renderCard={renderCard}
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
              renderCard={renderCard}
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
              renderCard={renderCard}
            />
          </>
        )}
      </section>
    );
  }

  // --- ANDROID: keep existing combined layout ---
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">AI Predictions</h2>
            <p className="text-[10px] text-muted-foreground">AI-powered match analysis</p>
          </div>
        </div>
        {predictions.length > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
            {predictions.length} matches
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedPredictions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPredictions.map((prediction) => renderCard(prediction))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-border/50 bg-card/50">
          <Brain className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No AI predictions available today</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-6 group bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-xs border-0 rounded-full"
            onClick={() => navigate("/ai-predictions")}
          >
            <span>See all AI Predictions</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
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
  renderCard: (p: any) => JSX.Element;
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
          {picks.map(renderCard)}
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
