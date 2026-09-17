import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  Brain,
  Loader2,
  ChevronRight,
  ArrowRight,
  Crown,
  Star,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { assignTiers, type Tier } from "@/components/ai-predictions/utils/tierAssignment";
import { getBestPickType } from "@/components/ai-predictions/utils/marketDerivation";

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

function derivePickLabel(prediction: any) {
  const bestType = (() => {
    try {
      return getBestPickType(prediction as any);
    } catch {
      return null;
    }
  })();
  const labelFromBestType = (() => {
    switch (bestType) {
      case "home_win": return `${prediction.home_team} Win`;
      case "away_win": return `${prediction.away_team} Win`;
      case "draw": return "Draw";
      case "dc_1x": return `${prediction.home_team} or Draw`;
      case "dc_x2": return `Draw or ${prediction.away_team}`;
      case "dc_12": return `${prediction.home_team} or ${prediction.away_team}`;
      case "over15": return "Over 1.5 Goals";
      case "over25": return "Over 2.5 Goals";
      case "over35": return "Over 3.5 Goals";
      case "under25": return "Under 2.5 Goals";
      case "under35": return "Under 3.5 Goals";
      case "btts_yes": return "BTTS Yes";
      case "btts_no": return "BTTS No";
      default: return null;
    }
  })();
  const labelMap: Record<string, string> = { "1": "Home Win", X: "Draw", "2": "Away Win" };
  const rawPred = String(prediction.prediction ?? "").trim();
  return labelFromBestType ?? labelMap[rawPred] ?? rawPred;
}

/* Mini decorative bar chart (image-2 style header cards) */
function MiniBarChart() {
  const bars = [28, 44, 58, 38, 68, 88, 52];
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-3 rounded-t-md bg-primary/15"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* Big header stat card — "AI PREDICTION" (image-2 top card) */
function HeaderStatCard({
  onClick,
  matchCount,
  avgAccuracy,
}: {
  onClick: () => void;
  matchCount: number;
  avgAccuracy: number;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border-2 border-primary/25 bg-card p-3 text-left shadow-md transition-all hover:border-primary/50 hover:shadow-lg sm:gap-4 sm:p-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
        <Brain className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-black uppercase tracking-tight text-sidebar sm:text-xl">
          AI Prediction
        </h3>
        <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
          {matchCount > 0 ? `${matchCount} matches today · Powered by AI` : "Powered by AI"}
        </p>
        <span className="mt-1.5 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary sm:text-[11px]">
          {avgAccuracy}% avg accuracy
        </span>
      </div>
      <div className="hidden shrink-0 lg:block">
        <MiniBarChart />
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* Confidence bar with % (image-2 rows) */
function ConfidenceBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`flex w-28 shrink-0 items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-foreground">{value}%</span>
    </div>
  );
}

function PredictionListRow({
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
  const locked = lockTier !== null;
  const isPremiumLock = lockTier === "premium";
  const watchAdMode = locked && showWatchAd && !isPremiumLock;
  const pick = derivePickLabel(prediction);
  const confidence = prediction.confidence ?? 0;

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-secondary/40 sm:gap-3 sm:px-4"
    >
      <span className="hidden w-11 shrink-0 text-xs font-bold text-muted-foreground sm:inline">
        {prediction.match_time}
      </span>
      <span className="hidden w-32 shrink-0 truncate text-[11px] font-semibold text-muted-foreground lg:inline">
        {prediction.league || "League"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase text-sidebar">
        {prediction.home_team} <span className="text-muted-foreground">vs</span> {prediction.away_team}
      </span>

      <span className="hidden shrink-0 text-[11px] font-black uppercase tracking-wide text-primary md:inline">
        AI Prediction
      </span>

      {watchAdMode ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatchAd?.();
          }}
          disabled={isUnlocking}
          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-70"
        >
          {isUnlocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
          Watch Ad
        </button>
      ) : locked ? (
        <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/45 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
          {isPremiumLock ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
          {isPremiumLock ? "Premium" : "Pro"}
        </span>
      ) : (
        <span className="shrink-0 rounded-md border border-success/50 bg-success/10 px-2 py-1 text-[11px] font-extrabold text-success sm:text-xs">
          {pick || "—"}
        </span>
      )}

      {confidence > 0 && <ConfidenceBar value={confidence} className="hidden sm:flex" />}
      {confidence > 0 && (
        <span className="shrink-0 text-xs font-bold tabular-nums text-primary sm:hidden">{confidence}%</span>
      )}

      <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
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

  const avgAccuracy = useMemo(() => {
    const withConf = predictions.filter((p) => (p.confidence ?? 0) > 0);
    if (!withConf.length) return 0;
    return Math.round(withConf.reduce((sum, p) => sum + (p.confidence ?? 0), 0) / withConf.length);
  }, [predictions]);

  const renderRow = (prediction: any, opts?: { forceWatchAd?: boolean }) => {
    // Lock based on the SAME tier classification as /ai-predictions.
    const tier = tierOf(prediction);
    const strength = tier === "premium" ? 90 : tier === "pro" ? 70 : 50;
    let baseTier = getLockTier(strength);
    // Android Free users: force the SECOND free pick into "Watch Ad to Unlock" mode
    if (opts?.forceWatchAd && isAndroidApp && isFree && tier === "free") {
      baseTier = "pro";
    }
    const lockTier: LockTier = canAccess("exclusive", "tip", prediction.id)
      ? baseTier === "premium" && !canAccess("premium", "tip", prediction.id)
        ? "premium"
        : null
      : baseTier;
    return (
      <PredictionListRow
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

  const dailyRows = [
    ...freePicks.map((p, idx) => renderRow(p, { forceWatchAd: idx === 1 })),
    ...proPicks.map((p) => renderRow(p)),
    ...premiumPicks.map((p) => renderRow(p)),
  ];

  return (
    <section className="space-y-4">
      {/* Image-2 style header stat card */}
      <HeaderStatCard
        onClick={() => navigate("/ai-predictions")}
        matchCount={predictions.length}
        avgAccuracy={avgAccuracy}
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
          {/* Card header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-sidebar sm:text-lg">AI Prediction</h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  AI-powered match analysis{predictions.length > 0 ? ` · ${predictions.length} matches today` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/ai-predictions")}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Rows — Free picks visible, Pro/Premium locked per plan */}
          {dailyRows.length > 0 ? (
            dailyRows
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No AI predictions available today
            </p>
          )}

          <div className="border-t border-border p-3 sm:p-4">
            <Button
              size="sm"
              className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
              onClick={() => navigate("/ai-predictions")}
            >
              <Brain className="mr-1.5 h-4 w-4" />
              <span className="truncate">See all AI Predictions / Pogledaj sve AI Predikcije</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
