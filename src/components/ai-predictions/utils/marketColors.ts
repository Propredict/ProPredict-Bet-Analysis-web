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
    chipClass: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    barGradient: "from-blue-500 via-blue-400 to-blue-400",
    glow: "rgba(249,115,22,0.45)",
    shortLabel: "Under",
  },
  btts: {
    chipClass: "bg-green-500/15 text-green-300 border-green-500/40",
    barGradient: "from-green-500 via-green-400 to-lime-400",
    glow: "rgba(34, 197, 94,0.45)",
    shortLabel: "BTTS",
  },
  dc: {
    chipClass: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    barGradient: "from-blue-500 via-blue-400 to-blue-400",
    glow: "rgba(139,92,246,0.45)",
    shortLabel: "DC",
  },
  "1x2": {
    chipClass: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    barGradient: "from-blue-500 via-blue-400 to-blue-400",
    glow: "rgba(8, 120, 249,0.45)",
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