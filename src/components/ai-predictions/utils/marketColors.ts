/**
 * Market category color system — used by Top Picks chips, market badges,
 * and confidence bars to give each pick type a recognizable visual identity.
 *
 * Mapping (per design spec):
 *  - Over   → blue
 *  - BTTS   → green
 *  - DC     → purple
 *  - Under  → orange
 *  - 1X2    → amber (default)
 */

export type MarketCategory = "over" | "under" | "btts" | "dc" | "1x2" | "other";

export function classifyMarket(prediction: string | null | undefined): MarketCategory {
  const p = (prediction ?? "").toLowerCase().trim();
  if (!p) return "other";
  if (p.includes("under")) return "under";
  if (p.includes("over")) return "over";
  if (p.includes("btts") || p.includes("both teams")) return "btts";
  if (p.includes("double chance") || /\b(1x|x2|12)\b/.test(p)) return "dc";
  if (p === "1" || p === "x" || p === "2" || p.includes("home") || p.includes("away") || p.includes("draw")) {
    return "1x2";
  }
  return "other";
}

export interface MarketColorTokens {
  /** Solid badge bg+text+border (for chips like "Over 2.5") */
  chipClass: string;
  /** Confidence bar gradient (Tailwind from-* via-* to-* classes) */
  barGradient: string;
  /** Soft glow color (used in shadow-* utilities, hex/rgba) */
  glow: string;
  /** Short label (BTTS, DC, etc.) — for compact chips */
  shortLabel: string;
}

export const MARKET_COLORS: Record<MarketCategory, MarketColorTokens> = {
  over: {
    chipClass: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    barGradient: "from-blue-500 via-sky-400 to-cyan-400",
    glow: "rgba(59,130,246,0.45)",
    shortLabel: "Over",
  },
  under: {
    chipClass: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    barGradient: "from-orange-500 via-amber-400 to-yellow-400",
    glow: "rgba(249,115,22,0.45)",
    shortLabel: "Under",
  },
  btts: {
    chipClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    barGradient: "from-emerald-500 via-green-400 to-lime-400",
    glow: "rgba(16,185,129,0.45)",
    shortLabel: "BTTS",
  },
  dc: {
    chipClass: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    barGradient: "from-violet-500 via-purple-400 to-fuchsia-400",
    glow: "rgba(139,92,246,0.45)",
    shortLabel: "DC",
  },
  "1x2": {
    chipClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    barGradient: "from-amber-500 via-orange-400 to-yellow-400",
    glow: "rgba(245,158,11,0.45)",
    shortLabel: "1X2",
  },
  other: {
    chipClass: "bg-muted/40 text-muted-foreground border-border/40",
    barGradient: "from-primary via-primary to-primary/80",
    glow: "rgba(15,155,142,0.4)",
    shortLabel: "Pick",
  },
};

export function getMarketColors(prediction: string | null | undefined): MarketColorTokens {
  return MARKET_COLORS[classifyMarket(prediction)];
}