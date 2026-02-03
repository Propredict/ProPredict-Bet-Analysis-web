import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";

import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIPredictionsSidebar } from "@/components/ai-predictions/AIPredictionsSidebar";
import { InContentAd } from "@/components/ads/EzoicAd";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useAIPredictionStats } from "@/hooks/useAIPredictionStats";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useFavorites } from "@/hooks/useFavorites";
import { useInterstitialAd } from "@/hooks/useInterstitialAd";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Search, Activity, Target, Brain, BarChart3, Sparkles, TrendingUp, RefreshCw, Star, ArrowUpDown, Heart, Gift, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "confidence" | "kickoff" | "risk";
type TierFilter = "all" | "free" | "pro" | "premium";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("confidence");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const { predictions, loading } = useAIPredictions(day);
  const { stats, loading: statsLoading } = useAIPredictionStats();
  const { isAdmin, plan } = useUserPlan();
  const { isFavorite, isSaving, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  // Trigger interstitial ad on Android when page loads
  useInterstitialAd();

  const isPremiumUser = plan === "premium";
  const isProUser = plan === "basic"; // Pro plan is stored as "basic" in DB

  // Helper to determine prediction tier
  const getPredictionTier = (prediction: typeof predictions[0]): "free" | "pro" | "premium" => {
    if (prediction.is_premium && prediction.confidence > 80) return "premium";
    if (prediction.confidence > 70) return "pro";
    return "free";
  };

  // Count predictions per tier
  const tierCounts = useMemo(() => {
    const counts = { free: 0, pro: 0, premium: 0 };
    predictions.forEach((p) => {
      counts[getPredictionTier(p)]++;
    });
    return counts;
  }, [predictions]);

  // Sort function
  const sortPredictions = (preds: typeof predictions) => {
    return [...preds].sort((a, b) => {
      switch (sortBy) {
        case "confidence":
          return b.confidence - a.confidence;
        case "kickoff":
          // Sort by time string
          const timeA = a.match_time || "99:99";
          const timeB = b.match_time || "99:99";
          return timeA.localeCompare(timeB);
        case "risk":
          // low < medium < high
          const riskOrder = { low: 0, medium: 1, high: 2 };
          const riskA = riskOrder[a.risk_level as keyof typeof riskOrder] ?? 1;
          const riskB = riskOrder[b.risk_level as keyof typeof riskOrder] ?? 1;
          return riskA - riskB;
        default:
          return 0;
      }
    });
  };

  // Filter predictions by search, league, favorites, and tier
  const filteredPredictions = useMemo(() => {
    let result = predictions;
    
    // Filter by tier if not "all"
    if (tierFilter !== "all") {
      result = result.filter((p) => getPredictionTier(p) === tierFilter);
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
  }, [predictions, searchQuery, selectedLeague, sortBy, showFavoritesOnly, isFavorite, tierFilter]);

  // Separate featured (premium/high confidence) from regular predictions
  const featuredPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => p.is_premium || p.confidence > 70);
  }, [filteredPredictions]);

  const regularPredictions = useMemo(() => {
    return filteredPredictions.filter((p) => !p.is_premium && p.confidence <= 70);
  }, [filteredPredictions]);

  // Calculate live count from predictions
  const liveCount = useMemo(() => {
    return predictions.filter((p) => p.is_live).length;
  }, [predictions]);

  // Total matches analyzed
  const totalAnalyzed = stats.won + stats.lost + stats.pending;

  const handleRefresh = () => {
    // UI only refresh - just triggers a visual feedback
    window.location.reload();
  };

  return (
    <>
      <Helmet>
        <title>AI Predictions – ProPredict</title>
        <meta
          name="description"
          content="AI-generated sports predictions and statistical insights. No guarantee of accuracy. For informational purposes only."
        />
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
            
            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {/* Search - Enhanced visibility with gradient border */}
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
              
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[90px] md:w-[120px] h-7 md:h-8 text-[10px] md:text-xs bg-card border-border rounded">
                  <ArrowUpDown className="w-2.5 h-2.5 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="confidence" className="text-[10px] md:text-xs">Confidence</SelectItem>
                  <SelectItem value="kickoff" className="text-[10px] md:text-xs">Kickoff</SelectItem>
                  <SelectItem value="risk" className="text-[10px] md:text-xs">Risk</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Favorites Toggle */}
              <Toggle
                pressed={showFavoritesOnly}
                onPressedChange={setShowFavoritesOnly}
                className="h-7 w-7 md:h-8 md:w-8 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive border border-border rounded"
                aria-label="Show favorites only"
              >
                <Heart className={cn("w-3 md:w-3.5 h-3 md:h-3.5", showFavoritesOnly && "fill-current")} />
              </Toggle>
              
              {/* ML Badge */}
              <Badge className="bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5 text-[9px] md:text-[10px] hidden sm:flex rounded">
                <Sparkles className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5" />
                ML
              </Badge>
              
              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8 border-border rounded"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-3 md:w-3.5 h-3 md:h-3.5" />
              </Button>
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

          {/* Stats Cards Row - Compact */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-1.5">
            <Card className="flex items-center gap-1.5 p-1.5 md:p-2 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/15 rounded">
              <div className="p-1 md:p-1.5 rounded bg-destructive/10">
                <Activity className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Live</p>
                <p className="text-xs md:text-sm font-bold text-destructive">{liveCount}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-1.5 p-1.5 md:p-2 bg-gradient-to-br from-success/10 to-success/5 border-success/15 rounded">
              <div className="p-1 md:p-1.5 rounded bg-success/10">
                <Target className="w-3 h-3 md:w-4 md:h-4 text-success" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Accuracy</p>
                <p className="text-xs md:text-sm font-bold text-success">
                  {statsLoading ? "..." : `${stats.accuracy}%`}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-1.5 p-1.5 md:p-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15 rounded">
              <div className="p-1 md:p-1.5 rounded bg-primary/10">
                <Brain className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Active</p>
                <p className="text-xs md:text-sm font-bold text-primary">
                  {statsLoading ? "..." : stats.pending}
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
                  {statsLoading ? "..." : totalAnalyzed.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* AI Accuracy Section */}
          <Card className="bg-card border-border rounded">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between mb-1.5 md:mb-2">
                <div className="flex items-center gap-1 md:gap-1.5">
                  <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-muted-foreground" />
                  <span className="text-[10px] md:text-xs font-medium text-foreground">AI Accuracy</span>
                </div>
                <Badge className="bg-success/10 text-success border-success/20 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded">
                  {stats.accuracy}%
                </Badge>
              </div>
              
              {/* Stats indicators */}
              <div className="flex items-center gap-2 md:gap-4 mb-1.5 md:mb-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-success" />
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">Won</span>
                  <span className="text-[10px] md:text-xs font-semibold text-success">{stats.won}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-destructive" />
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">Lost</span>
                  <span className="text-[10px] md:text-xs font-semibold text-destructive">{stats.lost}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-warning" />
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">Pending</span>
                  <span className="text-[10px] md:text-xs font-semibold text-warning">{stats.pending}</span>
                </div>
              </div>

              {/* Visual accuracy bar */}
              {totalAnalyzed > 0 && (
                <div className="h-1 md:h-1.5 bg-secondary rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${(stats.won / totalAnalyzed) * 100}%` }}
                  />
                  <div
                    className="h-full bg-destructive"
                    style={{ width: `${(stats.lost / totalAnalyzed) * 100}%` }}
                  />
                  <div
                    className="h-full bg-warning"
                    style={{ width: `${(stats.pending / totalAnalyzed) * 100}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Filter Tabs */}
          <div className="flex gap-2 md:gap-2.5 overflow-x-auto pb-1 pr-4 scrollbar-hide">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 flex-shrink-0 gap-1.5",
                tierFilter === "all"
                  ? "bg-primary/30 text-primary border-2 border-primary shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                  : "bg-card/80 text-primary border-2 border-primary/50 hover:bg-primary/25 hover:border-primary hover:shadow-[0_0_15px_rgba(34,197,94,0.25)]"
              )}
              onClick={() => setTierFilter("all")}
            >
              All ({predictions.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 flex-shrink-0 gap-1.5",
                tierFilter === "free"
                  ? "bg-emerald-500/30 text-emerald-400 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : "bg-card/80 text-emerald-400 border-2 border-emerald-500/50 hover:bg-emerald-500/25 hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              )}
              onClick={() => setTierFilter("free")}
            >
              <Gift className="w-3.5 md:w-4 h-3.5 md:h-4" />
              Free ({tierCounts.free})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 flex-shrink-0 gap-1.5",
                tierFilter === "pro"
                  ? "bg-amber-500/30 text-amber-400 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  : "bg-card/80 text-amber-400 border-2 border-amber-500/50 hover:bg-amber-500/25 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              )}
              onClick={() => setTierFilter("pro")}
            >
              <Star className="w-3.5 md:w-4 h-3.5 md:h-4" />
              Pro ({tierCounts.pro})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 flex-shrink-0 gap-1.5",
                tierFilter === "premium"
                  ? "bg-fuchsia-500/30 text-fuchsia-400 border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.4)]"
                  : "bg-card/80 text-fuchsia-400 border-2 border-fuchsia-500/50 hover:bg-fuchsia-500/25 hover:border-fuchsia-500 hover:shadow-[0_0_15px_rgba(217,70,239,0.25)]"
              )}
              onClick={() => setTierFilter("premium")}
            >
              <Crown className="w-3.5 md:w-4 h-3.5 md:h-4" />
              Premium ({tierCounts.premium})
            </Button>
          </div>

          {featuredPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
                <Star className="w-3 md:w-3.5 h-3 md:h-3.5 text-warning fill-warning" />
                <h2 className="text-xs md:text-sm font-semibold text-foreground">Featured</h2>
                <span className="text-[9px] md:text-[10px] text-muted-foreground ml-auto">Updated now</span>
              </div>
              <div className="grid md:grid-cols-2 gap-1.5 md:gap-2">
                {featuredPredictions.map((prediction, index) => {
                  const predTier = getPredictionTier(prediction);
                  // Show ads after every 4th card for Free & Pro tiers only (not Premium)
                  const showAdAfter = predTier !== "premium" && tierFilter !== "premium" && (index + 1) % 4 === 0 && index < featuredPredictions.length - 1;
                  return (
                    <React.Fragment key={prediction.id}>
                      <AIPredictionCard
                        prediction={prediction}
                        isAdmin={isAdmin}
                        isPremiumUser={isPremiumUser}
                        isProUser={isProUser}
                        isFavorite={isFavorite(prediction.match_id)}
                        isSavingFavorite={isSaving(prediction.match_id)}
                        onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                        onGoPremium={() => navigate("/get-premium")}
                      />
                      {showAdAfter && <InContentAd />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Daily Predictions Section */}
          <div>
            <div className="flex items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
              <Brain className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
              <h2 className="text-xs md:text-sm font-semibold text-foreground">
                {day === "today" ? "Daily" : "Tomorrow"} ({regularPredictions.length})
              </h2>
            </div>

            {loading ? (
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
                {regularPredictions.map((prediction, index) => {
                  // Show ads after every 4th card for Free tier only (regular predictions are free tier)
                  // No ads when Premium filter is active
                  const showAdAfter = tierFilter !== "premium" && (index + 1) % 4 === 0 && index < regularPredictions.length - 1;
                  return (
                    <React.Fragment key={prediction.id}>
                      <AIPredictionCard
                        prediction={prediction}
                        isAdmin={isAdmin}
                        isPremiumUser={isPremiumUser}
                        isProUser={isProUser}
                        isFavorite={isFavorite(prediction.match_id)}
                        isSavingFavorite={isSaving(prediction.match_id)}
                        onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                        onGoPremium={() => navigate("/get-premium")}
                      />
                      {showAdAfter && <InContentAd />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
