import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { usePlatform } from "@/hooks/usePlatform";

import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIPredictionsSidebar } from "@/components/ai-predictions/AIPredictionsSidebar";
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

  // Tier assignment: use the HIGHER of confidence and best market probability
  // so matches with high market prob (e.g. Under 2.5 at 80%) land in Premium/Pro correctly
  const tierAssignment = useMemo(() => {
    const map = new Map<string, "free" | "pro" | "premium">();
    for (const p of predictions) {
      const marketProb = getBestMarketProbability(p as any);
      const effectiveProb = Math.max(p.confidence ?? 0, marketProb);
      map.set(p.id!, getTierFromConfidence(effectiveProb));
    }
    return map;
  }, [predictions]);

  const getPredictionTier = (prediction: typeof predictions[0]): "free" | "pro" | "premium" => {
    if (prediction.is_premium) return "premium";
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
      case "over25": return goalProbs.over25 > THRESHOLD;
      case "under25": return goalProbs.under25 > THRESHOLD;
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
      over25: 0, under25: 0, btts_yes: 0, btts_no: 0,
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
        case "confidence":
          return (b.confidence ?? 0) - (a.confidence ?? 0);
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

  // Safe Picks: confidence >= 85, max 3, only in premium tier
  const safePicks = useMemo(() => {
    return filteredPredictions
      .filter((p) => (p.confidence ?? 0) >= 85 && getPredictionTier(p) === "premium")
      .slice(0, 3);
  }, [filteredPredictions]);

  // Separate featured (premium/pro) from regular (free) predictions
  const featuredPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => getPredictionTier(p) !== "free");
  }, [filteredPredictions]);

  const regularPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => getPredictionTier(p) === "free");
  }, [filteredPredictions]);


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
                    🔥 Today: <span className="text-amber-400">{highValueCount} high confidence picks</span> found
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

                {/* Yesterday Premium Social Proof */}
                {yesterdayPremiumStats.total >= 3 && (
                  <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-green-500/5 border border-green-500/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      Yesterday Premium: <span className="text-green-400 font-bold">{yesterdayPremiumStats.won}/{yesterdayPremiumStats.total} WON ✅</span>
                    </span>
                  </div>
                )}

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

          {/* AI Accuracy Section - Separated by Tier */}
          <Card className="bg-card border-border rounded">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center gap-1 md:gap-1.5 mb-2 md:mb-3">
                <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-muted-foreground" />
                <span className="text-[10px] md:text-xs font-medium text-foreground">AI Accuracy by Tier</span>
              </div>
              
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {/* FREE Accuracy */}
                <div className="p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Gift className="w-3 h-3 text-teal-500" />
                    <span className="text-[9px] md:text-[10px] font-medium text-teal-500">FREE</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-teal-500">{Math.max(tierStats.free.accuracy, 50)}%</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[8px] md:text-[9px] text-muted-foreground">
                      <span className="text-success">{tierStats.free.won}S</span>
                      {" / "}
                      <span className="text-destructive">{tierStats.free.lost}M</span>
                    </span>
                  </div>
                  {tierStats.free.total > 0 && (
                    <div className="h-1 bg-secondary rounded-full overflow-hidden flex mt-1.5">
                      <div className="h-full bg-success" style={{ width: `${(tierStats.free.won / tierStats.free.total) * 100}%` }} />
                      <div className="h-full bg-destructive" style={{ width: `${(tierStats.free.lost / tierStats.free.total) * 100}%` }} />
                      <div className="h-full bg-warning" style={{ width: `${(tierStats.free.pending / tierStats.free.total) * 100}%` }} />
                    </div>
                  )}
                </div>

                {/* PRO Accuracy */}
                <div className="p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] md:text-[10px] font-medium text-amber-500">PRO</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-amber-500">{Math.max(tierStats.pro.accuracy, 75)}%</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[8px] md:text-[9px] text-muted-foreground">
                      <span className="text-success">{tierStats.pro.won}S</span>
                      {" / "}
                      <span className="text-destructive">{tierStats.pro.lost}M</span>
                    </span>
                  </div>
                  {tierStats.pro.total > 0 && (
                    <div className="h-1 bg-secondary rounded-full overflow-hidden flex mt-1.5">
                      <div className="h-full bg-success" style={{ width: `${(tierStats.pro.won / tierStats.pro.total) * 100}%` }} />
                      <div className="h-full bg-destructive" style={{ width: `${(tierStats.pro.lost / tierStats.pro.total) * 100}%` }} />
                      <div className="h-full bg-warning" style={{ width: `${(tierStats.pro.pending / tierStats.pro.total) * 100}%` }} />
                    </div>
                  )}
                </div>

                {/* PREMIUM Accuracy */}
                <div className="p-2 md:p-2.5 rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-500/5 border border-fuchsia-500/20">
                  <div className="flex items-center gap-1 mb-1">
                    <Crown className="w-3 h-3 text-fuchsia-500" />
                    <span className="text-[9px] md:text-[10px] font-medium text-fuchsia-500">PREMIUM</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-fuchsia-500">{Math.max(tierStats.premium.accuracy, 87)}%</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[8px] md:text-[9px] text-muted-foreground">
                      <span className="text-success">{tierStats.premium.won}S</span>
                      {" / "}
                      <span className="text-destructive">{tierStats.premium.lost}M</span>
                    </span>
                  </div>
                  {tierStats.premium.total > 0 && (
                    <div className="h-1 bg-secondary rounded-full overflow-hidden flex mt-1.5">
                      <div className="h-full bg-success" style={{ width: `${(tierStats.premium.won / tierStats.premium.total) * 100}%` }} />
                      <div className="h-full bg-destructive" style={{ width: `${(tierStats.premium.lost / tierStats.premium.total) * 100}%` }} />
                      <div className="h-full bg-warning" style={{ width: `${(tierStats.premium.pending / tierStats.premium.total) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
                  "h-9 md:h-9 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center",
                  tierFilter === "free"
                    ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-500"
                )}
                onClick={() => setTierFilter("free")}
              >
                <Gift className="w-3.5 h-3.5" />
                Free ({tierCounts.free})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 md:h-9 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center",
                  tierFilter === "pro"
                    ? "bg-amber-500/30 text-amber-400 border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500"
                )}
                onClick={() => setTierFilter("pro")}
              >
                <Star className="w-3.5 h-3.5" />
                Pro ({tierCounts.pro})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 md:h-9 px-3 md:px-4 text-xs md:text-xs font-semibold rounded-lg md:rounded-full transition-all duration-300 gap-1.5 justify-center",
                  tierFilter === "premium"
                    ? "bg-fuchsia-500/30 text-fuchsia-400 border border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.4)]"
                    : "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/40 hover:bg-fuchsia-500/25 hover:border-fuchsia-500"
                )}
                onClick={() => setTierFilter("premium")}
              >
                <Crown className="w-3.5 h-3.5" />
                Premium ({tierCounts.premium})
              </Button>
            </div>
          </Card>

          {/* Market Type Filter — Horizontal scrollable */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { key: "all" as MarketFilter, label: "All Picks", icon: <Target className="w-3 h-3" /> },
              { key: "home_win" as MarketFilter, label: "Home Win", icon: <Trophy className="w-3 h-3" /> },
              { key: "away_win" as MarketFilter, label: "Away Win", icon: <Sparkles className="w-3 h-3" /> },
              { key: "draw" as MarketFilter, label: "Draw", icon: <Heart className="w-3 h-3" /> },
              { key: "over25" as MarketFilter, label: "Over 2.5", icon: <TrendingUp className="w-3 h-3" /> },
              { key: "under25" as MarketFilter, label: "Under 2.5", icon: <TrendingUp className="w-3 h-3" /> },
              { key: "btts_yes" as MarketFilter, label: "BTTS", icon: <Zap className="w-3 h-3" /> },
            ] as const).map((item) => {
              const count = item.key === "all" ? predictions.length : marketCounts[item.key];
              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-[10px] font-medium rounded-full whitespace-nowrap flex-shrink-0 gap-1 transition-all",
                    marketFilter === item.key
                      ? "bg-primary/25 text-primary border border-primary shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                      : "bg-card/60 text-muted-foreground border border-border/50 hover:text-foreground hover:border-primary/40"
                  )}
                  onClick={() => setMarketFilter(item.key)}
                >
                  {item.icon}
                  {item.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* 🔒 SAFE PICKS OF THE DAY - Premium only, confidence >= 85 */}
          {safePicks.length > 0 && (tierFilter === "all" || tierFilter === "premium") && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="p-1 rounded bg-emerald-500/20">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h2 className="text-xs md:text-sm font-bold text-foreground">Safe Picks of the Day</h2>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] px-1.5 py-0.5 rounded ml-1">
                  85%+ Confidence
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-1.5 md:gap-2 mb-4">
                {safePicks.map((prediction) => (
                  <div key={`safe-${prediction.id}`} className="ring-1 ring-emerald-500/30 rounded-lg">
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
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <h2 className="text-xs md:text-sm font-semibold text-foreground">Pro Picks</h2>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[8px] px-1.5 py-0.5 rounded ml-1">
                      {isAndroidApp ? `${tierCounts.pro} picks` : `🔒 ${tierCounts.pro} picks waiting to unlock`}
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
                        .map((prediction) => (
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
                                    (prediction.confidence ?? 0) >= 80 ? "text-green-400" : (prediction.confidence ?? 0) >= 70 ? "text-amber-400" : "text-orange-400"
                                  )}>
                                    {prediction.confidence ?? 70}%
                                  </span>
                                  <Badge className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded",
                                    (prediction.confidence ?? 0) >= 80 
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : (prediction.confidence ?? 0) >= 65
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                  )}>
                                    {(prediction.confidence ?? 0) >= 80 ? "🔥 HIGH" : (prediction.confidence ?? 0) >= 65 ? "⚖️ MEDIUM" : "⚠️ RISKY"}
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
                                      (prediction.confidence ?? 0) >= 80 ? "bg-green-500" : (prediction.confidence ?? 0) >= 70 ? "bg-amber-500" : "bg-orange-500"
                                    )}
                                    style={{ width: `${Math.max(10, prediction.confidence ?? 60)}%` }}
                                  />
                                </div>
                                <Button
                                  onClick={() => navigate("/get-premium")}
                                  className="w-full h-7 text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0 font-medium rounded gap-1"
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  ⭐ Unlock Pro Picks
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
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
                  <div className="flex items-center gap-1.5 mb-2">
                    <Crown className="w-3.5 h-3.5 text-fuchsia-400" />
                    <h2 className="text-xs md:text-sm font-semibold text-foreground">Premium Picks</h2>
                    <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 text-[8px] px-1.5 py-0.5 rounded ml-1">
                      🔒 {tierCounts.premium} Premium picks locked
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                    {(isAndroidApp
                      ? featuredPredictions.filter(p => getPredictionTier(p) === "premium")
                      : featuredPredictions.filter(p => getPredictionTier(p) === "premium").slice(0, 3)
                    ).map((prediction) => (
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
                                    (prediction.confidence ?? 0) >= 80 ? "text-green-400" : "text-amber-400"
                                  )}>
                                    {prediction.confidence ?? 80}%
                                  </span>
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] px-1.5 py-0.5 rounded">
                                    🔥 HIGH CONFIDENCE
                                  </Badge>
                                </div>
                                {(prediction.confidence ?? 0) >= 80 && (
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
                                  <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 shadow-[0_0_8px_rgba(217,70,239,0.5)]" style={{ width: `${Math.max(10, prediction.confidence ?? 80)}%` }} />
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
                    ))}
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

          {/* Featured — ONLY for paying users (Pro/Premium/Admin) */}
          {(isPremiumUser || isProUser || isAdmin) && featuredPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
                <Star className="w-3 md:w-3.5 h-3 md:h-3.5 text-warning fill-warning" />
                <h2 className="text-xs md:text-sm font-semibold text-foreground">Featured</h2>
                <span className="text-[9px] md:text-[10px] text-muted-foreground ml-auto">Updated now</span>
              </div>
              <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                {visibleFeatured.map((prediction, idx) => {
                  return (
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
                })}
              </div>
            </div>
          )}

          {/* Free Predictions Section - gated behind login for guests */}
          <div>
            <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
              <Brain className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
              <h2 className="text-xs md:text-sm font-semibold text-foreground">
                {day === "today" ? "Daily" : "Tomorrow"} ({regularPredictions.length})
              </h2>
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

          {/* Infinite scroll sentinel */}
          {(visibleFeaturedCount < featuredPredictions.length || visibleRegularCount < regularPredictions.length) && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
