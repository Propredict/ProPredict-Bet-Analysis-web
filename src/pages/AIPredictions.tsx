import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIPredictionsSidebar } from "@/components/ai-predictions/AIPredictionsSidebar";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useAIPredictionStats } from "@/hooks/useAIPredictionStats";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Search, Activity, Target, Brain, BarChart3, Sparkles, TrendingUp, RefreshCw, Star, ArrowUpDown, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "confidence" | "kickoff" | "risk";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("confidence");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { predictions, loading } = useAIPredictions(day);
  const { stats, loading: statsLoading } = useAIPredictionStats();
  const { isAdmin, plan } = useUserPlan();
  const { isFavorite, isSaving, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  const isPremiumUser = plan === "premium";

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

  // Filter predictions by search, league, and favorites
  const filteredPredictions = useMemo(() => {
    let result = predictions;
    
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
  }, [predictions, searchQuery, selectedLeague, sortBy, showFavoritesOnly, isFavorite]);

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
    <DashboardLayout>
      <div className="flex gap-3 md:gap-6 lg:gap-8">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
          <div className="sticky top-4 space-y-4">
            <div className="text-center pb-4 border-b border-border">
              <h1 className="text-xl font-bold text-foreground">AI Predictions</h1>
              <p className="text-xs text-muted-foreground mt-1">ML-powered match analysis</p>
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
        <div className="flex-1 min-w-0 space-y-3 md:space-y-5">
          {/* Header Section */}
          <div className="flex flex-col gap-2 md:gap-4">
            {/* Mobile Title */}
            <div className="lg:hidden">
              <h1 className="text-lg md:text-2xl font-bold text-foreground">AI Predictions</h1>
              <p className="text-muted-foreground text-xs md:text-sm">ML-powered match analysis</p>
            </div>
            
            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[140px] md:min-w-[200px] max-w-md">
                <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 md:w-4 h-3.5 md:h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 md:pl-10 h-8 md:h-10 text-xs md:text-sm bg-card border-border rounded-lg"
                />
              </div>
              
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[100px] md:w-[140px] h-8 md:h-10 text-xs md:text-sm bg-card border-border rounded-lg">
                  <ArrowUpDown className="w-3 h-3 mr-1 md:mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="confidence" className="text-xs md:text-sm">Confidence</SelectItem>
                  <SelectItem value="kickoff" className="text-xs md:text-sm">Kickoff</SelectItem>
                  <SelectItem value="risk" className="text-xs md:text-sm">Risk</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Favorites Toggle */}
              <Toggle
                pressed={showFavoritesOnly}
                onPressedChange={setShowFavoritesOnly}
                className="h-8 w-8 md:h-10 md:w-10 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive border border-border rounded-lg"
                aria-label="Show favorites only"
              >
                <Heart className={cn("w-3.5 md:w-4 h-3.5 md:h-4", showFavoritesOnly && "fill-current")} />
              </Toggle>
              
              {/* ML Badge */}
              <Badge className="bg-primary/10 text-primary border-primary/20 px-2 py-1 text-[10px] md:text-xs hidden sm:flex rounded-lg">
                <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1" />
                ML
              </Badge>
              
              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:h-10 md:w-10 border-border rounded-lg"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Day Selector */}
          <div className="flex gap-1.5 md:gap-2 lg:hidden">
            <Button
              variant={day === "today" ? "default" : "outline"}
              className={cn("flex-1 h-8 md:h-10 text-xs md:text-sm rounded-lg", day !== "today" && "border-border")}
              onClick={() => setDay("today")}
            >
              Today
            </Button>
            <Button
              variant={day === "tomorrow" ? "default" : "outline"}
              className={cn("flex-1 h-8 md:h-10 text-xs md:text-sm rounded-lg", day !== "tomorrow" && "border-border")}
              onClick={() => setDay("tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          {/* Stats Cards Row - Compact on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-3">
            <Card className="flex items-center gap-2 p-2 md:p-3 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/15 rounded-lg">
              <div className="p-1.5 md:p-2 rounded-lg bg-destructive/10">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Live</p>
                <p className="text-sm md:text-lg font-bold text-destructive">{liveCount}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-2 p-2 md:p-3 bg-gradient-to-br from-success/10 to-success/5 border-success/15 rounded-lg">
              <div className="p-1.5 md:p-2 rounded-lg bg-success/10">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Accuracy</p>
                <p className="text-sm md:text-lg font-bold text-success">
                  {statsLoading ? "..." : `${stats.accuracy}%`}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-2 p-2 md:p-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15 rounded-lg">
              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Active</p>
                <p className="text-sm md:text-lg font-bold text-primary">
                  {statsLoading ? "..." : stats.pending}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-2 p-2 md:p-3 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/15 rounded-lg">
              <div className="p-1.5 md:p-2 rounded-lg bg-accent/10">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Analyzed</p>
                <p className="text-sm md:text-lg font-bold text-accent">
                  {statsLoading ? "..." : totalAnalyzed.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* AI Accuracy Section */}
          <Card className="bg-card border-border rounded-lg">
            <CardContent className="p-2.5 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <TrendingUp className="w-3.5 md:w-4 h-3.5 md:h-4 text-muted-foreground" />
                  <span className="text-xs md:text-sm font-medium text-foreground">AI Accuracy</span>
                </div>
                <Badge className="bg-success/10 text-success border-success/20 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-lg">
                  {stats.accuracy}%
                </Badge>
              </div>
              
              {/* Stats indicators */}
              <div className="flex items-center gap-3 md:gap-6 mb-2 md:mb-3 flex-wrap">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-success" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">Won</span>
                  <span className="text-xs md:text-sm font-semibold text-success">{stats.won}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-destructive" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">Lost</span>
                  <span className="text-xs md:text-sm font-semibold text-destructive">{stats.lost}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-warning" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">Pending</span>
                  <span className="text-xs md:text-sm font-semibold text-warning">{stats.pending}</span>
                </div>
              </div>

              {/* Visual accuracy bar */}
              {totalAnalyzed > 0 && (
                <div className="h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden flex">
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

          {/* Featured Predictions Section */}
          {featuredPredictions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4">
                <Star className="w-3.5 md:w-4 h-3.5 md:h-4 text-warning fill-warning" />
                <h2 className="text-sm md:text-lg font-semibold text-foreground">Featured</h2>
                <span className="text-[10px] md:text-xs text-muted-foreground ml-auto">Updated now</span>
              </div>
              <div className="grid md:grid-cols-2 gap-2 md:gap-4">
                {featuredPredictions.map((prediction) => (
                  <AIPredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    isAdmin={isAdmin}
                    isPremiumUser={isPremiumUser}
                    isFavorite={isFavorite(prediction.match_id)}
                    isSavingFavorite={isSaving(prediction.match_id)}
                    onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                    onWatchAd={() => {}}
                    onGoPremium={() => navigate("/get-premium")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Daily Predictions Section */}
          <div>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4">
              <Brain className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-400" />
              <h2 className="text-sm md:text-lg font-semibold text-foreground">
                {day === "today" ? "Daily" : "Tomorrow"} ({regularPredictions.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-8 md:py-12">
                <div className="animate-spin w-6 md:w-8 h-6 md:h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3 md:mb-4" />
                <p className="text-muted-foreground text-xs md:text-sm">Loading...</p>
              </div>
            ) : regularPredictions.length === 0 && featuredPredictions.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Brain className="w-10 md:w-12 h-10 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-muted-foreground text-xs md:text-sm">
                  No predictions for {day === "today" ? "today" : "tomorrow"}
                  {selectedLeague ? ` in ${selectedLeague}` : ""}
                </p>
              </div>
            ) : regularPredictions.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <p className="text-muted-foreground text-xs md:text-sm">
                  All predictions are featured above
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {regularPredictions.map((prediction) => (
                  <AIPredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    isAdmin={isAdmin}
                    isPremiumUser={isPremiumUser}
                    isFavorite={isFavorite(prediction.match_id)}
                    isSavingFavorite={isSaving(prediction.match_id)}
                    onToggleFavorite={(matchId) => toggleFavorite(matchId, navigate)}
                    onWatchAd={() => {}}
                    onGoPremium={() => navigate("/get-premium")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
