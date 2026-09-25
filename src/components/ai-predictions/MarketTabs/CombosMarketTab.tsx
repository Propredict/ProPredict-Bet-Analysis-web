import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  calculateComboProbability,
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

export function CombosMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);

  const resultText = (leg: string) => {
    if (leg === "1") return `${prediction.home_team} to win`;
    if (leg === "2") return `${prediction.away_team} to win`;
    if (leg.toLowerCase() === "x") return "Match ends in a draw";
    if (leg.toLowerCase() === "btts yes") return "Both teams score";
    if (leg.toLowerCase() === "btts no") return "At least one team fails to score";
    return leg;
  };

  const buildCombo = (
    label: string,
    tag: string,
    kind: ComboView["kind"],
  ): ComboView => {
    const [resultLeg = "", goalsLeg = ""] = label.split(/\s*(?:&|\+)\s*/).map((s) => s.trim());
    const prob = calculateComboProbability(prediction, label) ?? 0;
    return {
      tag,
      title: label.replace(" & ", " + "),
      description: `${resultText(resultLeg)} + ${goalsLeg}${/^(over|under)/i.test(goalsLeg) ? " goals" : ""}`,
      prob,
      odds: fairOdds(prob),
      strength: kind === "risk" ? (prob >= 45 ? "Good" : "Higher Risk") : strengthFor(prob),
      kind,
    };
  };

  // Rank the generated combos by their real calculated probability. The first
  // card can never be labelled Best Pick when a stronger combo sits below it.
  const rankedCombos = markets.combos
    .map((combo) => buildCombo(combo.label, "", "value"))
    .sort((a, b) => b.prob - a.prob);

  const views: ComboView[] = rankedCombos.map((combo, index) => ({
    ...combo,
    tag: index === 0 ? "BEST PICK" : "VALUE PICK",
    kind: index === 0 ? "best" : "value",
    strength: strengthFor(combo.prob),
  }));

  // Risk combo: goals-profile combo chosen by our model —
  // "BTTS Yes + Over 2.5" (open game) or "BTTS No + Under 2.5" (tight game),
  // whichever has the higher joint probability in the same score distribution.
  const openProb = calculateComboProbability(prediction, "BTTS Yes + Over 2.5");
  const tightProb = calculateComboProbability(prediction, "BTTS No + Under 2.5");
  const riskComboLabel =
    openProb === null && tightProb === null
      ? null
      : (openProb ?? -1) >= (tightProb ?? -1)
        ? "BTTS Yes + Over 2.5"
        : "BTTS No + Under 2.5";
  const riskView = riskComboLabel ? buildCombo(riskComboLabel, "RISK COMBO", "risk") : null;

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
          "flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 overflow-hidden rounded-lg border p-2.5 transition-colors md:gap-x-3 md:p-3",
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
        <div className="min-w-0 flex-1 basis-[55%]">
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

        {/* Probability + odds + strength */}
        <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
          <div className={cn("min-w-0 flex-1 sm:w-24 sm:flex-none md:w-28", !hasAccess && "select-none blur-md")}>
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

          <div
            className={cn(
              "shrink-0 rounded-lg border border-primary/25 bg-card px-2 py-1.5 text-center",
              !hasAccess && "select-none blur-md",
            )}
          >
            <span className="block text-xs font-black tabular-nums text-foreground md:text-sm">
              {hasAccess ? view.odds : "•.••"}
            </span>
          </div>

          <span
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold md:text-[11px]",
              hasAccess ? styles.chip : "select-none bg-muted-foreground/10 text-muted-foreground/50 blur-sm",
            )}
          >
            {hasAccess ? view.strength : "•••••"}
          </span>
        </div>
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


      {hasAccess && (
        <p className="text-[10px] font-medium text-muted-foreground md:text-xs">
          Combining result + goals gives higher value odds.
          <span className="ml-1.5 text-[9px] md:text-[10px]">(Fair odds from our model)</span>
        </p>
      )}
    </div>
  );
}
