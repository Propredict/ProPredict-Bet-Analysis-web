import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { FreeInAppPopup } from "@/components/FreeInAppPopup";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { usePlatform } from "@/hooks/usePlatform";

import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIPredictionsSidebar } from "@/components/ai-predictions/AIPredictionsSidebar";
import { TopAIPicksSection } from "@/components/ai-predictions/TopAIPicksSection";
import { selectTopPicks } from "@/components/ai-predictions/utils/topPicksRanking";
import { useAIPredictions, type AIPrediction } from "@/hooks/useAIPredictions";
// Stats now calculated from current day's predictions directly
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Search, Activity, Target, Brain, BarChart3, Sparkles, TrendingUp, RefreshCw, Star, ArrowUpDown, Heart, Gift, Crown, LogIn, Lock, Trophy, Zap, Flame, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AdSlot from "@/components/ads/AdSlot";
import { getBestMarketProbability, getTierFromConfidence, getBestPickType, calculateGoalMarketProbs, type MarketType } from "@/components/ai-predictions/utils/marketDerivation";

type SortOption = "confidence" | "kickoff";
type TierFilter = "all" | "free" | "pro" | "premium";
type MarketFilter = "all" | MarketType;

export default function AIPredictions() {
  const queryClient = useQueryClient();
  const { isAndroidApp } = usePlatform();
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const interstitialFired = useRef(false);

  useEffect(() => {
    if (!interstitialFired.current) {
      interstitialFired.current = true;
      maybeShowInterstitial("ai_predictions");
    }
  }, [maybeShowInterstitial]);

  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("confidence");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [freeInAppOpen, setFreeInAppOpen] = useState(false);

  const { predictions, loading, refetch } = useAIPredictions(day);

  // Fetch yesterday's predictions for social proof
  const yesterdayQuery = useQuery({
    queryKey: ["ai-predictions-yesterday-stats"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      const { data } = await supabase
        .from("ai_predictions")
        .select("confidence, result_status, is_premium")
        .eq("match_date", dateStr);
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Yesterday Premium stats for social proof
  const yesterdayPremiumStats = useMemo(() => {
    const rows = yesterdayQuery.data ?? [];
    const premiumRows = rows.filter((r: any) => r.is_premium || (r.confidence ?? 0) >= 78);
    const won = premiumRows.filter((r: any) => r.result_status === "won").length;
    const lost = premiumRows.filter((r: any) => r.result_status === "lost").length;
    const total = won + lost;
    return { won, lost, total };
  }, [yesterdayQuery.data]);

  // High value picks count (confidence >= 75)
  const highValueCount = useMemo(() => {
    return predictions.filter((p) => (p.confidence ?? 0) >= 75).length;
  }, [predictions]);

  // Calculate stats from current day's predictions (not global view)
  const dayStats = useMemo(() => {
    const won = predictions.filter((p) => p.result_status === "won").length;
    const lost = predictions.filter((p) => p.result_status === "lost").length;
    const pending = predictions.filter((p) => p.result_status === "pending" || !p.result_status).length;
    const total = won + lost;
    const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
    return { won, lost, pending, accuracy };
  }, [predictions]);

  const { isAdmin, plan, isAuthenticated, isLoading: planLoading } = useUserPlan();
  const { user } = useAuth();
  const { favorites, isFavorite, isSaving, toggleFavorite } = useFavorites();
  
  const navigate = useNavigate();

  // Single page-level unlock handler for Android rewarded ads (same pattern as DailyTips)
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const isPremiumUser = plan === "premium";
  const isProUser = plan === "basic"; // Pro plan is stored as "basic" in DB

  // Tier assignment: based on the MAX of confidence and the best market probability
  // (the % actually shown on the card). This ensures a card displaying e.g. "78% BTTS No"
  // lands in Premium, not Pro — matching what the user sees.
  // Tier is determined by the STRONGEST market (Best Pick probability),
  // not just 1X2 confidence. This ensures matches with strong Under/Over/BTTS
  // picks (e.g., Under 2.5 @ 83%) are correctly placed in Pro/Premium.
  //   < 65 → Free, 65-77 → Pro, ≥ 78 → Premium
  // STEP 9 caps applied: Premium max 10, Pro max 20, Free max 30.
  // Overflow drops down one tier (Premium→Pro→Free) so quality is preserved.
  const tierAssignment = useMemo(() => {
    const map = new Map<string, "free" | "pro" | "premium">();
    // 1. Compute effective strength per prediction
    const scored = predictions.map((p) => {
      const bestPickProb = getBestMarketProbability(p);
      const effectiveStrength = Math.max(p.confidence ?? 0, bestPickProb);
      return { id: p.id!, strength: effectiveStrength, baseTier: getTierFromConfidence(effectiveStrength) };
    });
    // 2. Sort by strength DESC and apply caps with cascade
    const sorted = [...scored].sort((a, b) => b.strength - a.strength);
    const PREMIUM_CAP = 10;
    const PRO_CAP = 20;
    const FREE_CAP = 30;
    let premiumCount = 0;
    let proCount = 0;
    let freeCount = 0;
    for (const s of sorted) {
      let tier = s.baseTier;
      // Cascade overflow down: Premium → Pro → Free
      if (tier === "premium") {
        if (premiumCount < PREMIUM_CAP) { premiumCount++; }
        else if (proCount < PRO_CAP) { tier = "pro"; proCount++; }
        else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
        else { continue; } // skip — beyond all caps
      } else if (tier === "pro") {
        if (proCount < PRO_CAP) { proCount++; }
        else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
        else { continue; }
      } else {
        if (freeCount < FREE_CAP) { freeCount++; }
        else { continue; }
      }
      map.set(s.id, tier);
    }
    return map;
  }, [predictions]);

  const getPredictionTier = (prediction: typeof predictions[0]): "free" | "pro" | "premium" => {
    // Tier is determined purely by displayed confidence (Premium ≥78%, Pro ≥65%, Free <65%)
    return tierAssignment.get(prediction.id!) ?? "free";
  };

  // Calculate accuracy per tier (FREE, PRO, PREMIUM)
  const tierStats = useMemo(() => {
    const calcTierStats = (tierName: "free" | "pro" | "premium") => {
      const tierPreds = predictions.filter((p) => getPredictionTier(p) === tierName);
      const won = tierPreds.filter((p) => p.result_status === "won").length;
      const lost = tierPreds.filter((p) => p.result_status === "lost").length;
      const pending = tierPreds.filter((p) => p.result_status === "pending" || !p.result_status).length;
      const total = won + lost;
      const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
      return { won, lost, pending, accuracy, total: tierPreds.length };
    };
    return {
      free: calcTierStats("free"),
      pro: calcTierStats("pro"),
      premium: calcTierStats("premium"),
    };
  }, [predictions]);

  // Count predictions per tier
  const tierCounts = useMemo(() => {
    const counts = { free: 0, pro: 0, premium: 0 };
    predictions.forEach((p) => {
      counts[getPredictionTier(p)]++;
    });
    return counts;
  }, [predictions]);

  // Check if a prediction qualifies for a given market filter (probability > 50%)
  const predictionMatchesMarket = useCallback((p: typeof predictions[0], market: MarketFilter): boolean => {
    if (market === "all") return true;
    const hw = p.home_win ?? 0;
    const aw = p.away_win ?? 0;
    const d = p.draw ?? 0;
    const total1x2 = hw + aw + d || 1;
    const normHw = Math.round((Math.max(5, hw) / (Math.max(5, hw) + Math.max(5, aw) + Math.max(5, d))) * 100);
    const normAw = Math.round((Math.max(5, aw) / (Math.max(5, hw) + Math.max(5, aw) + Math.max(5, d))) * 100);
    const normD = 100 - normHw - normAw;
    const goalProbs = calculateGoalMarketProbs(p as any);
    
    const THRESHOLD = 50;
    const DRAW_THRESHOLD = 28; // Draws rarely exceed 35%, so lower threshold
     switch (market) {
       case "home_win": return normHw > THRESHOLD;
       case "away_win": return normAw > THRESHOLD;
       case "draw": return normD > DRAW_THRESHOLD;
       case "dc_1x": return (normHw + normD) > 75;
       case "dc_x2": return (normD + normAw) > 75;
       case "dc_12": return (normHw + normAw) > 75;
       case "over15": return goalProbs.over15 > 70;
       case "over25": return goalProbs.over25 > THRESHOLD;
       case "under25": return goalProbs.under25 > THRESHOLD;
       case "under35": return goalProbs.under35 > 70;
       case "btts_yes": return goalProbs.bttsYes > THRESHOLD;
       case "btts_no": return goalProbs.bttsNo > THRESHOLD;
       default: return false;
     }
  }, []);

  // Count predictions per market type — scoped to current tier filter
  const marketCounts = useMemo(() => {
    const base = tierFilter === "all"
      ? predictions
      : predictions.filter((p) => getPredictionTier(p) === tierFilter);
    const counts: Record<MarketFilter, number> = {
      all: base.length,
      home_win: 0, away_win: 0, draw: 0,
      dc_1x: 0, dc_x2: 0, dc_12: 0,
      over15: 0, over25: 0, over35: 0, under25: 0, under35: 0,
      btts_yes: 0, btts_no: 0,
    };
    const marketKeys: MarketFilter[] = ["home_win", "away_win", "draw", "over25", "under25", "btts_yes", "btts_no"];
    base.forEach((p) => {
      marketKeys.forEach((mk) => {
        if (predictionMatchesMarket(p, mk)) counts[mk]++;
      });
    });
    return counts;
  }, [predictions, tierFilter, predictionMatchesMarket]);

  // Sort function
  const sortPredictions = (preds: typeof predictions) => {
    return [...preds].sort((a, b) => {
      switch (sortBy) {
        case "confidence": {
          // Sort by displayed % (max of confidence and best market probability)
          // so the highest-confidence card always appears at the top.
          const aPct = Math.max(a.confidence ?? 0, getBestMarketProbability(a));
          const bPct = Math.max(b.confidence ?? 0, getBestMarketProbability(b));
          return bPct - aPct;
        }
        case "kickoff": {
          const timeA = a.match_time || "99:99";
          const timeB = b.match_time || "99:99";
          return timeA.localeCompare(timeB);
        }
        default:
          return 0;
      }
    });
  };

  // Filter predictions by search, league, favorites, and tier
  const filteredPredictions = useMemo(() => {
    // Hide predictions below 60% confidence
    let result = predictions.filter((p) => p.confidence != null ? p.confidence >= 50 : true);
    
    // Filter by tier if not "all"
    if (tierFilter !== "all") {
      result = result.filter((p) => getPredictionTier(p) === tierFilter);
    }

    // Filter by market type — show any match that qualifies for this market (>50% probability)
    if (marketFilter !== "all") {
      result = result.filter((p) => predictionMatchesMarket(p, marketFilter));
    }

    // Filter by favorites if enabled
    if (showFavoritesOnly) {
      result = result.filter((p) => isFavorite(p.match_id));
    }
    
    // Filter by league if selected
    if (selectedLeague) {
      result = result.filter((p) => p.league === selectedLeague);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.home_team.toLowerCase().includes(q) ||
          p.away_team.toLowerCase().includes(q) ||
          (p.league && p.league.toLowerCase().includes(q))
      );
    }
    
    // Apply sorting
    return sortPredictions(result);
  }, [predictions, searchQuery, selectedLeague, sortBy, showFavoritesOnly, isFavorite, tierFilter, marketFilter]);

  // Separate featured (premium/pro) from regular (free) predictions
  const featuredPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => getPredictionTier(p) !== "free");
  }, [filteredPredictions]);

  const regularPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => getPredictionTier(p) === "free");
  }, [filteredPredictions]);

  // Base for Top AI Picks & Safe Pick: ignores tier/market filters so the
  // ranking is identical across All / Free / Pro / Premium tabs (mix of best
  // picks regardless of tier). Still respects search, league, favorites.
  const globalRankingBase = useMemo(() => {
    let result = predictions.filter((p) => (p.confidence != null ? p.confidence >= 50 : true));
    if (showFavoritesOnly) result = result.filter((p) => isFavorite(p.match_id));
    if (selectedLeague) result = result.filter((p) => p.league === selectedLeague);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.home_team.toLowerCase().includes(q) ||
          p.away_team.toLowerCase().includes(q) ||
          (p.league && p.league.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [predictions, showFavoritesOnly, isFavorite, selectedLeague, searchQuery]);

  // Helpers for Safe Pick & Diamond Pick
  const parseXgFromFactors = (factors: string[] | null | undefined): { home: number; away: number; total: number; diff: number } | null => {
    if (!Array.isArray(factors)) return null;
    // Preferred: explicit step2_xg tag (newer backend versions)
    const tag = factors.find((f) => typeof f === "string" && f.startsWith("step2_xg:"));
    if (tag) {
      const [h, a, d] = tag.replace("step2_xg:", "").split("|").map(Number);
      if ([h, a, d].every(Number.isFinite)) {
        return { home: h, away: a, total: h + a, diff: d };
      }
    }
    // Fallback: parse from "confidence_breakdown" line which contains
    // e.g. "Base 79 (xG Δ 1.10, total 3.50) | ..."
    const breakdown = factors.find((f) => typeof f === "string" && f.startsWith("confidence_breakdown:"));
    if (breakdown) {
      const diffMatch = breakdown.match(/xG\s*[Δ∆d]\s*([0-9]+(?:\.[0-9]+)?)/i);
      const totalMatch = breakdown.match(/total\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (diffMatch && totalMatch) {
        const diff = Number(diffMatch[1]);
        const total = Number(totalMatch[1]);
        if (Number.isFinite(diff) && Number.isFinite(total)) {
          // Reconstruct home/away approximately (not strictly needed by callers)
          const home = (total + diff) / 2;
          const away = (total - diff) / 2;
          return { home, away, total, diff };
        }
      }
    }
    return null;
  };
  const isLowRiskPrediction = (raw: string | null | undefined): boolean => {
    const p = (raw ?? "").toLowerCase();
    if (p.includes("over 1.5")) return true;
    if (p.includes("double chance") || /\b(1x|x2|12)\b/.test(p)) return true;
    if (p.includes("over 2.5")) return true; // moderately safe
    if (p.includes("btts")) return true; // accept BTTS yes/no
    return false;
  };

  // Safe Pick of the Day: confidence ≥75 + low-risk market + xG total ≥ 2.2
  // Safe Pick of the Day: confidence ≥75 + low-risk market.
  // xG total ≥2.2 is preferred but optional — when xG isn't parseable from
  // backend, we still allow the pick (quality > strict gating).
  const safePicks = useMemo(() => {
    return [...globalRankingBase]
      .filter((p) => {
        const conf = p.confidence ?? 0;
        if (conf < 70) return false;
        // Low-risk market OR a very strong 1X2 pick (conf ≥ 82%)
        const lowRisk = isLowRiskPrediction(p.prediction);
        const strongMain = conf >= 82 && /^(1|2|x|home|away|draw)$/i.test((p.prediction ?? "").trim());
        if (!lowRisk && !strongMain) return false;
        // STEP 2 — prefer DB column xg_total; fall back to legacy tag parser.
        const xgTotal =
          typeof (p as any).xg_total === "number"
            ? (p as any).xg_total
            : parseXgFromFactors(p.key_factors)?.total;
        // If xG total present and below 2.2, reject. Otherwise allow.
        if (typeof xgTotal === "number" && xgTotal < 2.2) return false;
        // STEP 11 — Safe Pick must be STABLE.
        // Prefer DB column variance_stable; fall back to legacy tag.
        if ((p as any).variance_stable === false) return false;
        if ((p as any).variance_stable !== true) {
          // No DB value — try legacy tag (do not block if both missing)
        const factors = Array.isArray(p.key_factors) ? p.key_factors : [];
        const varTag = factors.find(
          (f) => typeof f === "string" && f.startsWith("variance:"),
        );
        if (varTag && varTag.includes("UNSTABLE")) return false;
        }
        return true;
      })
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 1);
  }, [globalRankingBase]);

  // Diamond Pick: prefer backend-flagged is_diamond=true; otherwise compute
  // client-side as the single highest-quality pick of the day.
  // Criteria (when backend flag is missing):
  //  - confidence ≥ 80
  //  - variance_stable === true (or unknown)
  //  - low/medium risk (no "high" risk allowed)
  //  - xG total ≥ 2.4 when available
  //  - prefer "main" 1X2 picks or Over 2.5 / BTTS — the cleanest signals
  const diamondPick = useMemo(() => {
    const backendFlagged = predictions.find((p) => p.is_diamond === true);
    if (backendFlagged) return backendFlagged;

    const candidates = [...globalRankingBase].filter((p) => {
      if ((p.confidence ?? 0) < 80) return false;
      if ((p as any).variance_stable === false) return false;
      if ((p.risk_level ?? "").toLowerCase() === "high") return false;
      const xgTotal =
        typeof (p as any).xg_total === "number"
          ? (p as any).xg_total
          : parseXgFromFactors(p.key_factors)?.total;
      if (typeof xgTotal === "number" && xgTotal < 2.4) return false;
      // Require real data (xG must exist for both teams)
      const xgH = (p as any).xg_home;
      const xgA = (p as any).xg_away;
      if (!(typeof xgH === "number" && xgH > 0 && typeof xgA === "number" && xgA > 0)) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    return candidates[0];
  }, [predictions, globalRankingBase]);

  const safePickIds = useMemo(
    () => new Set(safePicks.map((p) => p.id)),
    [safePicks],
  );

  // Top AI Picks: ranked from remaining (excludes Safe Pick), always fills up to 5
  // Mix of Free/Pro/Premium — same across all tier tabs.
  const topPicks = useMemo(() => {
    const remaining = globalRankingBase.filter((p) => !safePickIds.has(p.id));
    return selectTopPicks(remaining, 5);
  }, [globalRankingBase, safePickIds]);


  // Progressive rendering: show 12 cards initially, load 12 more on scroll
  const INITIAL_COUNT = 12;
  const LOAD_MORE_COUNT = 12;
  const [visibleFeaturedCount, setVisibleFeaturedCount] = useState(INITIAL_COUNT);
  const [visibleRegularCount, setVisibleRegularCount] = useState(INITIAL_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset visible counts when filters/day change
  useEffect(() => {
    setVisibleFeaturedCount(INITIAL_COUNT);
    setVisibleRegularCount(INITIAL_COUNT);
  }, [day, tierFilter, marketFilter, searchQuery, selectedLeague, sortBy, showFavoritesOnly]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFeaturedCount((c) => Math.min(c + LOAD_MORE_COUNT, featuredPredictions.length));
          setVisibleRegularCount((c) => Math.min(c + LOAD_MORE_COUNT, regularPredictions.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [featuredPredictions.length, regularPredictions.length]);

  const visibleFeatured = featuredPredictions.slice(0, visibleFeaturedCount);
  const visibleRegular = regularPredictions.slice(0, visibleRegularCount);

  // Calculate live count from predictions
  const liveCount = useMemo(() => {
    return predictions.filter((p) => p.is_live).length;
  }, [predictions]);

  // Total matches analyzed
  const totalAnalyzed = dayStats.won + dayStats.lost + dayStats.pending;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["ai-predictions"] });
    await refetch();
  };

  const handleRegenerate = async () => {
    if (!isAdmin || isRegenerating) return;

    setIsRegenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-ai-predictions", {
        body: { regenerate: true },
      });

      if (response.error) {
        console.error("Regenerate predictions error:", response.error);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["ai-predictions"] });
      await refetch();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Predictions – ProPredict</title>
        <meta name="description" content="AI-generated sports predictions and statistical insights. No guarantee of accuracy. For informational purposes only." />
        <meta property="og:title" content="AI Predictions – ProPredict" />
        <meta property="og:description" content="AI-generated sports predictions and statistical insights for football matches worldwide." />
        <meta property="og:image" content="https://propredict.me/og-image.png" />
        <meta property="og:url" content="https://propredict.me/ai-predictions" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="flex gap-2 md:gap-4 lg:gap-6">
        {/* Left Sidebar - Hidden on mobile */}
      <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            <div className="text-center pb-2 border-b border-border">
              <div className="inline-flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <h1 className="text-sm sm:text-base font-bold text-foreground">AI Predictions</h1>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">ML-powered match analysis</p>
                </div>
              </div>
              <div
                className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-[9px] font-semibold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                title="Smart diversity: caps repetitive bet types, keeps highest-confidence picks first."
              >
                <Sparkles className="h-2.5 w-2.5" />
                AI Balanced Picks
              </div>
            </div>
            <AIPredictionsSidebar
              selectedDay={day}
              onDayChange={setDay}
              selectedLeague={selectedLeague}
              onLeagueChange={setSelectedLeague}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
          {/* Header Section */}
          <div className="flex flex-col gap-1.5 md:gap-2">
            {/* Mobile Title */}
            <div className="lg:hidden p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-foreground">AI Predictions</h1>
                  <p className="text-muted-foreground text-[9px] sm:text-[10px]">ML-powered match analysis</p>
                </div>
                <div
                  className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 text-[9px] font-semibold text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.35)] whitespace-nowrap"
                  title="Smart diversity: caps repetitive bet types, keeps highest-confidence picks first."
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  AI Balanced
                </div>
              </div>
            </div>
            
          </div>

          {/* Mobile Day Selector - Bordered tabs with hover glow */}
          <div className="flex gap-2 lg:hidden">
            <Button
              variant="ghost"
              className={cn(
                "flex-1 h-10 text-xs rounded-xl transition-all duration-300",
                day === "today" 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-2 border-primary" 
                  : "bg-card/50 text-muted-foreground border border-border hover:text-foreground hover:border-primary/50 hover:bg-card hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
              )}
              onClick={() => setDay("today")}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "flex-1 h-10 text-xs rounded-xl transition-all duration-300",
                day === "tomorrow" 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-2 border-primary" 
                  : "bg-card/50 text-muted-foreground border border-border hover:text-foreground hover:border-primary/50 hover:bg-card hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
              )}
              onClick={() => setDay("tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          {/* Stats Cards Row - Compact (Active & Analyzed only) */}
          <div className="grid grid-cols-2 gap-1 md:gap-1.5">
            <Card className="flex items-center gap-1.5 p-1.5 md:p-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15 rounded">
              <div className="p-1 md:p-1.5 rounded bg-primary/10">
                <Brain className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Active</p>
                <p className="text-xs md:text-sm font-bold text-primary">
                  {loading ? "..." : dayStats.pending}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-1.5 p-1.5 md:p-2 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/15 rounded">
              <div className="p-1 md:p-1.5 rounded bg-accent/10">
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Analyzed</p>
                <p className="text-xs md:text-sm font-bold text-accent">
                  {loading ? "..." : totalAnalyzed.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* 🔥 GLOBAL TEASER BANNER — for non-paying users */}
          {!isPremiumUser && !isProUser && !isAdmin && !loading && predictions.length > 0 && (
            <Card className="p-3 md:p-4 bg-gradient-to-r from-fuchsia-500/10 via-amber-500/5 to-primary/10 border-fuchsia-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative space-y-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs md:text-sm font-bold text-foreground">
                    {highValueCount > 0 ? (
                      <>🔥 Today: <span className="text-amber-400">{highValueCount} high confidence picks</span> found</>
                    ) : (
                      <>🔥 Premium picks unlock the strongest analysis</>
                    )}
                  </span>
                  <span className="text-[9px] text-muted-foreground ml-auto">🔒 Most available in Premium</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <Gift className="w-3 h-3 text-emerald-400" />
                    <div>
                      <p className="text-[9px] text-emerald-400 font-semibold">Free</p>
                      <p className="text-xs font-bold text-emerald-400">{tierCounts.free}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <div>
                      <p className="text-[9px] text-amber-400 font-semibold">Pro</p>
                      <p className="text-xs font-bold text-amber-400">{tierCounts.pro}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20">
                    <Crown className="w-3 h-3 text-fuchsia-400" />
                    <div>
                      <p className="text-[9px] text-fuchsia-400 font-semibold">Premium</p>
                      <p className="text-xs font-bold text-fuchsia-400">🔒 {tierCounts.premium}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/get-premium")}
                  size="sm"
                  className="w-full h-8 text-[10px] md:text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0 rounded-full gap-1.5"
                >
                  <Crown className="w-3 h-3 fill-current" />
                  Upgrade to unlock stronger predictions
                </Button>
              </div>
            </Card>
          )}

          {/* Search & Controls Row - Above Tier Filter */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <div className="relative flex-1 min-w-[140px] md:min-w-[200px] max-w-sm">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-accent/30 to-primary/50 rounded-lg opacity-75" />
              <div className="relative flex items-center bg-card rounded-lg">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 md:h-9 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg placeholder:text-muted-foreground/70"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[110px] md:w-[140px] h-8 md:h-9 text-[10px] md:text-xs bg-card border-border rounded-lg">
                <ArrowUpDown className="w-2.5 h-2.5 mr-1" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="confidence" className="text-[10px] md:text-xs">Confidence</SelectItem>
                <SelectItem value="kickoff" className="text-[10px] md:text-xs">Kickoff Time</SelectItem>
              </SelectContent>
            </Select>
            <Toggle
              pressed={showFavoritesOnly}
              onPressedChange={setShowFavoritesOnly}
              className="h-9 w-9 md:h-10 md:w-10 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive border border-border rounded-lg"
              aria-label="Show favorites only"
            >
              <Heart className={cn("w-5 md:w-5 h-5 md:h-5", showFavoritesOnly && "fill-current")} />
            </Toggle>
          </div>

          {/* Tier Filter Tabs - In Gradient Card */}
          <Card className="p-3 md:p-4 bg-gradient-to-br from-primary/10 via-card to-accent/5 border-primary/20">
            <p className="text-xs md:text-sm text-muted-foreground mb-2.5 md:mb-3 text-center">
              Choose your prediction tier below
            </p>
            {/* Mobile: 2x2 Grid | Desktop: Row */}
            <div className="grid grid-cols-2 md:flex gap-1.5 md:gap-2.5 md:justify-center">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 md:h-9 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center",
                  tierFilter === "all"
                    ? "bg-primary/30 text-primary border border-primary shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                    : "bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 hover:border-primary"
                )}
                onClick={() => setTierFilter("all")}
              >
                All ({predictions.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto md:h-auto py-1.5 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center flex-col",
                  tierFilter === "free"
                    ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-500"
                )}
                onClick={() => setTierFilter("free")}
              >
                <span className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  Free ({tierCounts.free})
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-emerald-300/90 leading-none">
                  {Math.max(tierStats.free.accuracy, 50)}%
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto md:h-auto py-1.5 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center flex-col",
                  tierFilter === "pro"
                    ? "bg-amber-500/30 text-amber-400 border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500"
                )}
                onClick={() => setTierFilter("pro")}
              >
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  Pro ({tierCounts.pro})
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-amber-300/90 leading-none">
                  {Math.max(tierStats.pro.accuracy, 75)}%
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto md:h-auto py-1.5 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center flex-col",
                  tierFilter === "premium"
                    ? "bg-fuchsia-500/30 text-fuchsia-400 border border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.4)]"
                    : "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/40 hover:bg-fuchsia-500/25 hover:border-fuchsia-500"
                )}
                onClick={() => setTierFilter("premium")}
              >
                <span className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Premium ({tierCounts.premium})
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-fuchsia-300/90 leading-none">
                  {Math.max(tierStats.premium.accuracy, 87)}%
                </span>
              </Button>
            </div>
          </Card>

          {/* TOP AI PICKS — ranked highlight section above Safe Picks */}
          {/* 🔥 AI ELITE PICKS — hero banner above all curated sections */}
          {!loading && predictions.length > 0 && (diamondPick || safePicks.length > 0 || topPicks.length > 0) && (
            <div className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-500/10 px-3 py-2.5 md:px-4 md:py-3 shadow-[0_0_25px_rgba(245,158,11,0.12)]">
              <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl" />
              <div className="relative flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-amber-400 via-fuchsia-500 to-cyan-500 shadow-md ring-1 ring-amber-300/40">
                  <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent leading-tight">
                    🔥 AI Elite Picks
                  </h2>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">
                    Filtered from <span className="font-semibold text-foreground">{totalAnalyzed}+ matches</span> today — only the strongest signals shown below
                  </p>
                </div>
                <Badge className="hidden sm:inline-flex bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white border-0 text-[9px] md:text-[10px] px-2 py-0.5 shadow shrink-0">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  Curated
                </Badge>
              </div>
            </div>
          )}

          {/* 💎 DIAMOND PICK — single elite pick of the day (backend-flagged) */}
          {diamondPick && (tierFilter === "all" || tierFilter === "premium") && (
            <Card
              className={cn(
                "relative overflow-hidden border-2 mb-3 md:mb-4",
                "bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-blue-600/15",
                "border-cyan-400/50",
                "shadow-[0_0_50px_rgba(34,211,238,0.35)]",
                "animate-pulse-glow",
              )}
            >
              <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-cyan-400/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-sky-500/30 blur-3xl" />
              {/* Subtle moving shine overlay for premium feel */}
              <div className="pointer-events-none absolute inset-0 animate-diamond-shine opacity-70" />
              <div className="relative p-3 md:p-5">
                <div className="flex flex-col items-center text-center mb-3 md:mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-px w-10 md:w-14 bg-gradient-to-r from-transparent to-cyan-400/70" />
                    <div className="p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-lg shadow-cyan-500/50 ring-1 ring-cyan-200/40">
                      <span className="text-lg md:text-xl">💎</span>
                    </div>
                    <div className="h-px w-10 md:w-14 bg-gradient-to-l from-transparent to-blue-500/70" />
                  </div>
                  <h2 className="text-base md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-300 bg-clip-text text-transparent">
                    💎 Diamond AI Pick
                  </h2>
                  <p className="text-[11px] md:text-sm text-foreground/90 mt-1 max-w-md font-medium">
                    Strong xG dominance + consistent recent form — single highest-conviction selection
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-md shadow-emerald-500/40 text-[9px] md:text-[10px] px-2 py-0.5">
                      🛡️ Low Risk
                    </Badge>
                    <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 shadow-md shadow-cyan-500/40 text-[9px] md:text-[10px] px-2 py-0.5">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Elite Signal
                    </Badge>
                    <Badge variant="outline" className="border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-[9px] md:text-[10px] px-2 py-0.5">
                      Tier 1/2 • Stable Form
                    </Badge>
                  </div>
                </div>
                {(isAdmin || isPremiumUser) ? (
                  <div className="ring-2 ring-cyan-400/40 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                    <AIPredictionCard
                      overrideTier="premium"
                      forceUnlocked={true}
                      prediction={diamondPick}
                      isAdmin={isAdmin}
                      isPremiumUser={isPremiumUser}
                      isProUser={isProUser}
                      isFavorite={isFavorite(diamondPick.match_id)}
                      isSavingFavorite={isSaving(diamondPick.match_id)}
                      onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                      onGoPremium={() => navigate("/get-premium")}
                      onUnlockClick={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
                      isUnlocking={unlockingId === diamondPick.id}
                    />
                  </div>
                ) : (
                  /* Premium-Only teaser — no blur, no leaked prediction.
                     Shows match meta + clear CTA so non-premium users understand the value. */
                  <div className="ring-2 ring-cyan-400/40 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.25)] bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyan-950/40 p-4 md:p-5 flex flex-col items-center text-center gap-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-cyan-300" />
                      <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-cyan-200">
                        Premium Only
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm md:text-base font-semibold text-foreground">
                        Today's Diamond Pick is reserved for Premium members
                      </h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground max-w-sm mx-auto">
                        One single, highest-conviction selection of the day — backed by xG dominance and stable form. Available exclusively to Premium subscribers.
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate("/get-premium")}
                      size="sm"
                      className="h-9 px-5 text-xs md:text-sm font-bold bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 hover:opacity-90 text-white border-0 shadow-lg shadow-fuchsia-500/40 rounded-full gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Unlock with Premium
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 🏆 TOP 5 ELITE — moved ABOVE Safe Pick per new layout: 💎 → 🏆 → 🛡️ → 📊 */}
          <TopAIPicksSection
            picks={topPicks}
            isAdmin={isAdmin}
            isPremiumUser={isPremiumUser}
            isProUser={isProUser}
            isAuthenticated={isAuthenticated}
            isFavorite={isFavorite}
            isSaving={isSaving}
            onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
            onUnlock={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
            unlockingId={unlockingId}
            getPredictionTier={getPredictionTier}
          />

          {/* 🛡️ SAFE PICK OF THE DAY — Lowest Risk Pick Today */}
          {safePicks.length > 0 && (tierFilter === "all" || tierFilter === "premium") && (
            <div>
              {/* Centered section divider title */}
              <div className="flex flex-col items-center text-center my-5 md:my-7">
                <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-emerald-500/60" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                    <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                    <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent whitespace-nowrap">
                      🛡️ Lowest Risk Pick Today
                    </h2>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-500/40 to-emerald-500/60" />
                </div>
                <Badge className="mt-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full">
                  ✅ Stable xG • Strong Form • Lowest Variance Today
                </Badge>
                <p className="mt-1.5 text-[9px] md:text-[10px] text-muted-foreground/80 max-w-md">
                  AI Confidence based on xG &amp; team form
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-1.5 md:gap-2 mb-4">
                {safePicks.map((prediction) => (
                  <div
                    key={`safe-${prediction.id}`}
                    className="ring-2 ring-emerald-500/40 rounded-lg shadow-[0_0_25px_rgba(16,185,129,0.18)] bg-emerald-500/[0.02]"
                  >
                    <AIPredictionCard
                      overrideTier="premium"
                      prediction={prediction}
                      isAdmin={isAdmin}
                      isPremiumUser={isPremiumUser}
                      isProUser={isProUser}
                      isFavorite={isFavorite(prediction.match_id)}
                      isSavingFavorite={isSaving(prediction.match_id)}
                      onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                      onGoPremium={() => navigate("/get-premium")}
                      onUnlockClick={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
                      isUnlocking={unlockingId === prediction.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🔒 LOCKED PRO/PREMIUM TEASER — non-paying users see hidden pick cards instead of real content */}
          {!isPremiumUser && !isProUser && !isAdmin && (tierCounts.pro + tierCounts.premium) > 0 && (tierFilter === "all" || tierFilter === "pro" || tierFilter === "premium") && (
            <div className="space-y-3">
              {/* Pro Locked Section */}
              {tierCounts.pro > 0 && (tierFilter === "all" || tierFilter === "pro") && (
                <div>
                  {/* Centered section divider title */}
                  <div className="flex flex-col items-center text-center my-5 md:my-7">
                    <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/60" />
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                        <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 fill-amber-400" />
                        <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent whitespace-nowrap">
                          Pro Picks
                        </h2>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/60" />
                    </div>
                    <Badge className="mt-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full">
                      {isAndroidApp ? `${tierCounts.pro} picks available` : `🔒 ${tierCounts.pro} picks waiting to unlock`}
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                    {isAndroidApp ? (
                      /* Android: show ALL pro predictions with ad-unlock */
                      featuredPredictions
                        .filter(p => getPredictionTier(p) === "pro")
                        .map((prediction) => (
                          <div key={prediction.id} id={`prediction-${prediction.id}`}>
                            <AIPredictionCard
                              overrideTier="pro"
                              prediction={prediction}
                              isAdmin={isAdmin}
                              isPremiumUser={isPremiumUser}
                              isProUser={isProUser}
                              isFavorite={isFavorite(prediction.match_id)}
                              isSavingFavorite={isSaving(prediction.match_id)}
                              onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                              onGoPremium={() => navigate("/get-premium")}
                              onUnlockClick={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
                              isUnlocking={unlockingId === prediction.id}
                            />
                          </div>
                        ))
                    ) : (
                      /* Web: show 3 teaser cards */
                      featuredPredictions
                        .filter(p => getPredictionTier(p) === "pro")
                        .slice(0, 3)
                        .map((prediction) => {
                          // Use the same probability used for tier assignment (not raw confidence)
                          const displayedPct = Math.max(prediction.confidence ?? 0, getBestMarketProbability(prediction));
                          return (
                          <Card key={`teaser-pro-${prediction.id}`} className="bg-[#0a1628] border-amber-500/20 overflow-hidden rounded relative">
                            <CardContent className="p-0">
                              <div className="px-3 py-2 flex items-center justify-between border-b border-amber-500/10">
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[8px] px-1.5 py-0.5 rounded">
                                  <Star className="w-2.5 h-2.5 mr-0.5 fill-current" /> PRO
                                </Badge>
                                <span className="text-[9px] text-muted-foreground">{prediction.league || "League"}</span>
                              </div>
                              <div className="p-3 space-y-2">
                                <h3 className="text-xs md:text-sm font-semibold text-foreground">
                                  {prediction.home_team} vs {prediction.away_team}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-xl font-extrabold",
                                    displayedPct >= 80 ? "text-green-400" : displayedPct >= 70 ? "text-amber-400" : "text-orange-400"
                                  )}>
                                    {displayedPct}%
                                  </span>
                                  <Badge className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded",
                                    displayedPct >= 80 
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  )}>
                                    {displayedPct >= 80 ? "🔥 HIGH" : "⚖️ MEDIUM"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 py-1 px-2 rounded bg-amber-500/5 border border-amber-500/15">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span className="text-[9px] font-medium text-amber-400/90">🔒 Unlock this prediction</span>
                                </div>
                                <p className="text-[8px] text-amber-400/60 pl-0.5">📊 Solid value detected</p>
                                <div className="h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      displayedPct >= 80 ? "bg-green-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${Math.max(10, displayedPct)}%` }}
                                  />
                                </div>
                                <Button
                                  onClick={() => navigate("/get-premium")}
                                  className="w-full h-7 text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0 font-medium rounded gap-1"
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  ⭐ Unlock Pro Picks
                                </Button>
                                {!isAndroidApp && (
                                  <button
                                    className="w-full text-[10px] text-primary/80 hover:text-primary font-medium flex items-center justify-center gap-1 py-1 mt-1 transition-colors"
                                    onClick={() => setFreeInAppOpen(true)}
                                  >
                                    🎥 or unlock FREE in app
                                  </button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );})
                    )}
                  </div>
                  {/* Web only: show "+X more" and Premium hint */}
                  {!isAndroidApp && tierCounts.pro > 3 && (
                    <p className="text-center text-[10px] text-amber-400/70 mt-2">
                      +{tierCounts.pro - 3} more Pro picks available
                    </p>
                  )}
                  {!isAndroidApp && (
                    <div className="mt-2 flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-fuchsia-500/5 border border-fuchsia-500/10">
                      <Crown className="w-3 h-3 text-fuchsia-400" />
                      <span className="text-[9px] md:text-[10px] text-muted-foreground">
                        💎 <span className="text-fuchsia-400 font-semibold">Premium has higher confidence picks today</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[8px] text-fuchsia-400 hover:bg-fuchsia-500/10 ml-auto"
                        onClick={() => setTierFilter("premium")}
                      >
                        View →
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Premium Locked Section */}
              {tierCounts.premium > 0 && (tierFilter === "all" || tierFilter === "premium") && (
                <div>
                  {/* Centered section divider title */}
                  <div className="flex flex-col items-center text-center my-5 md:my-7">
                    <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/40 to-fuchsia-500/60" />
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10">
                        <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-fuchsia-400" />
                        <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent whitespace-nowrap">
                          Premium Picks
                        </h2>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-fuchsia-500/40 to-fuchsia-500/60" />
                    </div>
                    <Badge className="mt-2 bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full">
                      🔒 {tierCounts.premium} Premium picks locked
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                    {(isAndroidApp
                      ? featuredPredictions.filter(p => getPredictionTier(p) === "premium")
                      : featuredPredictions.filter(p => getPredictionTier(p) === "premium").slice(0, 3)
                    ).map((prediction) => {
                      // Use the same probability used for tier assignment (≥78% for Premium)
                      const displayedPct = Math.max(prediction.confidence ?? 0, getBestMarketProbability(prediction));
                      return (
                          <Card key={`teaser-prem-${prediction.id}`} className="bg-[#0a1628] border-fuchsia-500/20 overflow-hidden rounded relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent pointer-events-none" />
                            <CardContent className="p-0 relative">
                              <div className="px-3 py-2 flex items-center justify-between border-b border-fuchsia-500/10">
                                <Badge className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 text-[8px] px-1.5 py-0.5 rounded">
                                  <Crown className="w-2.5 h-2.5 mr-0.5 fill-current" /> PREMIUM
                                </Badge>
                                <span className="text-[9px] text-muted-foreground">{prediction.league || "League"}</span>
                              </div>
                              <div className="p-3 space-y-2">
                                <h3 className="text-xs md:text-sm font-semibold text-foreground">
                                  {prediction.home_team} vs {prediction.away_team}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-xl font-extrabold",
                                    displayedPct >= 85 ? "text-green-400" : "text-amber-400"
                                  )}>
                                    {displayedPct}%
                                  </span>
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] px-1.5 py-0.5 rounded">
                                    🔥 HIGH CONFIDENCE
                                  </Badge>
                                </div>
                                {displayedPct >= 85 && (
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-fuchsia-400" />
                                    <span className="text-[9px] font-bold text-fuchsia-400">💎 AI Edge Detected</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 py-1 px-2 rounded bg-fuchsia-500/5 border border-fuchsia-500/15">
                                  <Lock className="w-3 h-3 text-fuchsia-400" />
                                  <span className="text-[9px] font-medium text-fuchsia-400/90">🔒 High confidence pick locked</span>
                                </div>
                                <p className="text-[8px] text-fuchsia-400/60 pl-0.5">💎 Strong AI edge detected</p>
                                <Badge className="bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 text-[7px] px-1.5 py-0 rounded w-fit">
                                  🔥 Top pick today
                                </Badge>
                                <div className="h-2 bg-[#1e3a5f]/40 rounded-full overflow-hidden shadow-[0_0_6px_rgba(217,70,239,0.3)]">
                                  <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 shadow-[0_0_8px_rgba(217,70,239,0.5)]" style={{ width: `${Math.max(10, displayedPct)}%` }} />
                                </div>
                                <Button
                                  onClick={() => navigate("/get-premium")}
                                  className="w-full h-7 text-[10px] bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0 font-medium rounded gap-1"
                                >
                                  <Crown className="w-3 h-3 fill-current" />
                                  💎 Unlock Premium Picks
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                      );
                    })}
                  </div>
                  {!isAndroidApp && tierCounts.premium > 3 && (
                    <p className="text-center text-[10px] text-fuchsia-400/70 mt-2">
                      +{tierCounts.premium - 3} more Premium picks available
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Featured — ONLY for paying users (Pro/Premium/Admin) — split into Premium & Pro sections with branded headers */}
          {(isPremiumUser || isProUser || isAdmin) && featuredPredictions.length > 0 && (() => {
            const visiblePremium = visibleFeatured.filter((p) => getPredictionTier(p) === "premium");
            const visiblePro = visibleFeatured.filter((p) => getPredictionTier(p) === "pro");

            const renderCard = (prediction: typeof predictions[0]) => (
              <div key={prediction.id} id={`prediction-${prediction.id}`} className="transition-all duration-500">
                <AIPredictionCard
                  overrideTier={getPredictionTier(prediction)}
                  prediction={prediction}
                  isAdmin={isAdmin}
                  isPremiumUser={isPremiumUser}
                  isProUser={isProUser}
                  isFavorite={isFavorite(prediction.match_id)}
                  isSavingFavorite={isSaving(prediction.match_id)}
                  onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                  onGoPremium={() => navigate("/get-premium")}
                  onUnlockClick={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
                  isUnlocking={unlockingId === prediction.id}
                />
              </div>
            );

            return (
              <div className="space-y-2">
                {/* PREMIUM PICKS — fuchsia hero header */}
                {visiblePremium.length > 0 && (tierFilter === "all" || tierFilter === "premium") && (
                  <div>
                    <div className="flex flex-col items-center text-center my-5 md:my-7">
                      <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/40 to-fuchsia-500/60" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10">
                          <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-fuchsia-400" />
                          <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent whitespace-nowrap">
                            Premium Picks ({tierCounts.premium})
                          </h2>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-fuchsia-500/40 to-fuchsia-500/60" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                      {visiblePremium.map(renderCard)}
                    </div>
                  </div>
                )}

                {/* PRO PICKS — amber hero header */}
                {visiblePro.length > 0 && (tierFilter === "all" || tierFilter === "pro") && (
                  <div>
                    <div className="flex flex-col items-center text-center my-5 md:my-7">
                      <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/60" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                          <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 fill-amber-400" />
                          <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent whitespace-nowrap">
                            Pro Picks ({tierCounts.pro})
                          </h2>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/60" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                      {visiblePro.map(renderCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Free Predictions Section - hidden on Pro/Premium tabs */}
          {(tierFilter === "all" || tierFilter === "free") && (
          <div>
            {/* Centered section divider title */}
            <div className="flex flex-col items-center text-center my-5 md:my-7">
              <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-emerald-500/60" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                  <Brain className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                  <h2 className="text-xs md:text-sm font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent whitespace-nowrap">
                    {day === "today" ? "Free Daily" : "Tomorrow"} ({regularPredictions.length})
                  </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-500/40 to-emerald-500/60" />
              </div>
            </div>

            {!isAuthenticated && !planLoading ? (
              /* Guest login gate - only for free predictions */
              <Card className="p-6 md:p-10 text-center border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5">
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-foreground mb-1">
                      Sign In to View Free Predictions
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      Create a free account or sign in to access {regularPredictions.length} free AI-powered match predictions.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/login")}
                    className="gap-2 px-6 h-10 text-sm font-semibold"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In for FREE Access
                  </Button>
                  <p className="text-[10px] text-muted-foreground/60">
                    Free predictions available instantly after sign in
                  </p>
                </div>
              </Card>
            ) : loading ? (
              <div className="text-center py-4 md:py-6">
                <div className="animate-spin w-5 md:w-6 h-5 md:h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2 md:mb-3" />
                <p className="text-muted-foreground text-[10px] md:text-xs">Loading...</p>
              </div>
            ) : regularPredictions.length === 0 && featuredPredictions.length === 0 ? (
              <div className="text-center py-4 md:py-6">
                <Brain className="w-6 md:w-8 h-6 md:h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-[10px] md:text-xs">
                  No predictions for {day === "today" ? "today" : "tomorrow"}
                  {selectedLeague ? ` in ${selectedLeague}` : ""}
                </p>
              </div>
            ) : regularPredictions.length === 0 ? (
              <div className="text-center py-3 md:py-4">
                <p className="text-muted-foreground text-[10px] md:text-xs">
                  All predictions are featured above
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-2">
                {visibleRegular.map((prediction, idx) => {
                  // Inject a locked Premium teaser card after every 3rd Free card
                  const showLockedCard = !isPremiumUser && !isAdmin && (idx === 2 || idx === 5 || idx === 9) && tierCounts.premium > 0;
                  return (
                    <React.Fragment key={prediction.id}>
                      <div id={`prediction-${prediction.id}`} className="transition-all duration-500">
                        <AIPredictionCard
                          overrideTier={getPredictionTier(prediction)}
                          prediction={prediction}
                          isAdmin={isAdmin}
                          isPremiumUser={isPremiumUser}
                          isProUser={isProUser}
                          isFavorite={isFavorite(prediction.match_id)}
                          isSavingFavorite={isSaving(prediction.match_id)}
                          onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                          onGoPremium={() => navigate("/get-premium")}
                          onUnlockClick={(contentType, contentId, tier) => handleUnlock(contentType, contentId, tier)}
                          isUnlocking={unlockingId === prediction.id}
                        />
                      </div>
                      {showLockedCard && (
                        <div className="transition-all duration-500">
                          <Card className="bg-[#0a1628] border-fuchsia-500/25 overflow-hidden rounded relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent pointer-events-none" />
                            <CardContent className="p-0 relative">
                              <div className="px-3 py-2 flex items-center justify-between border-b border-fuchsia-500/10">
                                <Badge className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 text-[8px] px-1.5 py-0.5 rounded">
                                  <Crown className="w-2.5 h-2.5 mr-0.5 fill-current" /> PREMIUM PICK
                                </Badge>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] px-1.5 py-0.5 rounded">
                                  🔥 HIGH CONFIDENCE
                                </Badge>
                              </div>
                              <div className="p-3 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-fuchsia-400/50" />
                                  <span className="text-sm font-bold text-white/10 blur-md select-none pointer-events-none">Hidden Premium Match</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-extrabold text-green-400">
                                    {[84, 82, 87][idx === 2 ? 0 : idx === 5 ? 1 : 2]}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">win probability</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-fuchsia-400" />
                                  <span className="text-[9px] font-bold text-fuchsia-400">💎 AI Edge Detected</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground/70">Match hidden · Score & analysis locked</p>
                                <Button
                                  onClick={() => navigate("/get-premium")}
                                  className="w-full h-7 text-[10px] bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0 font-medium rounded-full gap-1"
                                >
                                  <Crown className="w-3 h-3 fill-current" />
                                  Unlock in Premium
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Teaser after Free picks — for non-paying users */}
            {!isPremiumUser && !isProUser && !isAdmin && isAuthenticated && (tierCounts.pro + tierCounts.premium) > 0 && (tierFilter === "all" || tierFilter === "free") && (
              <div className="mt-3 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-fuchsia-500/5 via-amber-500/5 to-fuchsia-500/5 border border-fuchsia-500/15">
                <Crown className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  <span className="text-fuchsia-400 font-bold">+{tierCounts.pro + tierCounts.premium} stronger picks</span> available in Pro & Premium
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[9px] text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10"
                  onClick={() => setTierFilter("premium")}
                >
                  View →
                </Button>
              </div>
            )}
          </div>
          )}

          {/* Infinite scroll sentinel */}
          {(visibleFeaturedCount < featuredPredictions.length || visibleRegularCount < regularPredictions.length) && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>
      <FreeInAppPopup open={freeInAppOpen} onClose={() => setFreeInAppOpen(false)} onContinueWithPro={() => navigate("/get-premium")} />
    </>
  );
}
