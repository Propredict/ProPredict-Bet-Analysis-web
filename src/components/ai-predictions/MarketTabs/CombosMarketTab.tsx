import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  calculateGoalMarketProbs,
  deriveMarkets,
  getConsistentSafeCombo,
} from "../utils/marketDerivation";
import {
  BarChart3,
  Diamond,
  Flame,
  Lightbulb,
  Layers,
  Sparkles,
  Star,
} from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

interface ComboView {
  tag: string;
  title: string;
  description: string;
  prob: number;
  odds: string;
  strength: string;
  kind: "best" | "value" | "risk";
}

const strengthFor = (prob: number) =>
  prob >= 65 ? "Strong" : prob >= 50 ? "Good" : "Moderate";

const fairOdds = (prob: number) => (prob > 0 ? (100 / prob).toFixed(2) : "—");

/** Parse a combo label like "1 & Over 1.5" into result leg + goals leg. */
function parseComboLabel(label: string) {
  const parts = label.split(/\s*(?:&|\+)\s*/).map((s) => s.trim());
  const resultLeg = parts.find((p) => ["1", "2", "x"].includes(p.toLowerCase())) ?? "1";
  const goalsLeg = parts.find((p) => !["1", "2", "x"].includes(p.toLowerCase())) ?? "Over 1.5";
  return { resultLeg, goalsLeg };
}

export function CombosMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);
  const goalProbs = calculateGoalMarketProbs(prediction);

  // Raw DB 1X2 values do not always sum to 100, so always use the normalized
  // set (the same numbers shown on the card) or combos read far too low.
  const norm = getNormalized1x2(prediction);

  const resultProb = (leg: string) => {
    switch (leg.toLowerCase()) {
      case "1":
        return norm.hw;
      case "2":
        return norm.aw;
      default:
        return norm.d;
    }
  };

  const goalsProb = (leg: string) => {
    const l = leg.toLowerCase().replace(" goals", "").trim();
    if (l === "over 1.5") return goalProbs.over15;
    if (l === "over 2.5") return goalProbs.over25;
    if (l === "over 3.5") return goalProbs.over35;
    if (l === "under 2.5") return goalProbs.under25;
    if (l === "under 3.5") return 100 - goalProbs.over35;
    return 50;
  };

  const resultText = (leg: string) => {
    if (leg === "1") return `${prediction.home_team} to win`;
    if (leg === "2") return `${prediction.away_team} to win`;
    return "Match ends in a draw";
  };

  const buildCombo = (
    label: string,
    tag: string,
    kind: ComboView["kind"],
  ): ComboView => {
    const { resultLeg, goalsLeg } = parseComboLabel(label);
    // Joint probability estimate: independence of result and goals legs
    const prob = Math.round((resultProb(resultLeg) * goalsProb(goalsLeg)) / 100);
    return {
      tag,
      title: label.replace(" & ", " + "),
      description: `${resultText(resultLeg)} + ${goalsLeg} goals`,
      prob,
      odds: fairOdds(prob),
      strength: kind === "risk" ? (prob >= 45 ? "Good" : "Higher Risk") : strengthFor(prob),
      kind,
    };
  };

  const views: ComboView[] = markets.combos.map((combo, index) =>
    buildCombo(
      combo.label,
      index === 0 ? "BEST PICK" : "VALUE PICK",
      index === 0 ? "best" : "value",
    ),
  );

  // Risk combo from tagged key factor (e.g. "2 + Over 1.5")
  const taggedCombo = prediction.key_factors
    ?.find((factor) => factor.startsWith("[TAG]SAFE_COMBO:"))
    ?.replace("[TAG]SAFE_COMBO:", "") ?? null;
  const riskComboLabel = getConsistentSafeCombo(prediction, taggedCombo);
  const riskView = riskComboLabel
    ? buildCombo(riskComboLabel, "RISK COMBO", "risk")
    : null;

  const insight = (prediction.analysis || "").trim();

  if (views.length === 0 && !riskView) {
    return (
      <div className="py-4 text-center md:py-6">
        <Layers className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground md:h-8 md:w-8" />
        <p className="text-xs text-muted-foreground md:text-sm">No combos for this match</p>
      </div>
    );
  }

  const kindStyles = {
    best: {
      iconWrap: "bg-success/15",
      icon: "text-success",
      tag: "bg-success text-success-foreground",
      card: "border-success/40 bg-success/10",
      bar: "bg-success",
      text: "text-success",
      chip: "bg-success/15 text-success",
    },
    value: {
      iconWrap: "bg-primary/15",
      icon: "text-primary",
      tag: "bg-primary text-primary-foreground",
      card: "border-primary/30 bg-secondary/60",
      bar: "bg-primary",
      text: "text-primary",
      chip: "bg-primary/10 text-primary",
    },
    risk: {
      iconWrap: "bg-destructive/15",
      icon: "text-destructive",
      tag: "bg-destructive text-destructive-foreground",
      card: "border-destructive/30 bg-destructive/5",
      bar: "bg-destructive/70",
      text: "text-foreground",
      chip: "bg-destructive/15 text-destructive",
    },
  } as const;

  const icons = {
    best: <Diamond className="h-4 w-4 md:h-5 md:w-5" />,
    value: <Star className="h-4 w-4 md:h-5 md:w-5" />,
    risk: <Flame className="h-4 w-4 md:h-5 md:w-5" />,
  } as const;

  const renderCombo = (view: ComboView, index: number) => {
    const styles = kindStyles[view.kind];
    return (
      <div
        key={`${view.kind}-${index}`}
        className={cn(
          "flex min-w-0 flex-col gap-2 rounded-lg border p-2.5 transition-colors sm:flex-row sm:items-center md:gap-3 md:p-3",
          styles.card,
        )}
      >
        {/* Icon + tag */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full md:h-10 md:w-10",
              styles.iconWrap,
            )}
          >
            <span className={styles.icon}>{icons[view.kind]}</span>
          </div>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide md:text-[10px]",
              styles.tag,
            )}
          >
            {view.tag}
          </span>
        </div>

        {/* Title + description */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-black leading-tight md:text-base",
              !hasAccess && "select-none blur-md",
            )}
          >
            {hasAccess ? view.title : "•••• • •••• •••"}
          </p>
          <p className="mt-0.5 truncate text-[9px] font-medium leading-tight text-muted-foreground md:text-[11px]">
            {hasAccess ? view.description : "Combination of result and goals"}
          </p>
        </div>

        {/* Probability + bar */}
        <div className={cn("shrink-0 sm:w-24 md:w-28", !hasAccess && "select-none blur-md")}>
          <span
            className={cn(
              "block text-base font-black tabular-nums leading-none md:text-xl",
              hasAccess ? styles.text : "text-muted-foreground",
            )}
          >
            {hasAccess ? `${view.prob}%` : "••%"}
          </span>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10 md:h-2">
            <div
              className={cn("h-full rounded-full", styles.bar)}
              style={{ width: hasAccess ? `${Math.min(view.prob, 100)}%` : "50%" }}
            />
          </div>
        </div>

        {/* Fair odds */}
        <div
          className={cn(
            "shrink-0 rounded-lg border border-primary/25 bg-card px-2 py-1.5 text-center sm:w-14 md:w-16",
            !hasAccess && "select-none blur-md",
          )}
        >
          <span className="block text-xs font-black tabular-nums text-foreground md:text-sm">
            {hasAccess ? view.odds : "•.••"}
          </span>
        </div>

        {/* Strength chip */}
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold md:text-[11px]",
            hasAccess ? styles.chip : "select-none bg-muted-foreground/10 text-muted-foreground/50 blur-sm",
          )}
        >
          {hasAccess ? view.strength : "•••••"}
        </span>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-2.5 md:space-y-3">
      {/* Header */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary md:h-10 md:w-10">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground md:text-base">Smart Combos</h4>
            <p className="text-[10px] font-medium leading-tight text-muted-foreground md:text-xs">
              AI generated combinations with higher value and probability.
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-[10px] font-extrabold text-primary md:text-xs">AI Optimized</span>
        </span>
      </div>

      {/* Combo cards */}
      <div className="space-y-1.5 md:space-y-2">
        {views.map((view, index) => renderCombo(view, index))}
        {riskView && renderCombo(riskView, views.length)}
      </div>

      {/* AI Insight */}
      {hasAccess && insight && (
        <div className="rounded-lg border border-primary/20 bg-secondary/50 p-2.5 md:p-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-extrabold text-primary md:text-sm">AI Insight</span>
            <BarChart3 className="ml-auto hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </div>
          <p className="mt-1.5 text-[10px] font-medium leading-snug text-foreground/90 md:text-xs md:leading-relaxed">
            {insight}
          </p>
        </div>
      )}

      {hasAccess && (
        <p className="text-[10px] font-medium text-muted-foreground md:text-xs">
          Combining result + goals gives higher value odds.
          <span className="ml-1.5 text-[9px] md:text-[10px]">(Fair odds from our model)</span>
        </p>
      )}
    </div>
  );
}
