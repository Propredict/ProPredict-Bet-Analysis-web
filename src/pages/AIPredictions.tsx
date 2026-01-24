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
      <div className="flex gap-6 lg:gap-8">
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
        <div className="flex-1 min-w-0 space-y-5 md:space-y-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            {/* Mobile Title */}
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-foreground">AI Predictions</h1>
              <p className="text-muted-foreground text-sm mt-1">ML-powered match analysis</p>
            </div>
            
            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search team or league..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[140px] bg-card border-border">
                  <ArrowUpDown className="w-3 h-3 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="kickoff">Kickoff Time</SelectItem>
                  <SelectItem value="risk">Risk Level</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Favorites Toggle */}
              <Toggle
                pressed={showFavoritesOnly}
                onPressedChange={setShowFavoritesOnly}
                className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive border border-border"
                aria-label="Show favorites only"
              >
                <Heart className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
              </Toggle>
              
              {/* ML Badge */}
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5 hidden sm:flex">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Powered by ML
              </Badge>
              
              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                className="border-border"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Day Selector */}
          <div className="flex gap-2 lg:hidden">
            <Button
              variant={day === "today" ? "default" : "outline"}
              className={cn("flex-1", day !== "today" && "border-border")}
              onClick={() => setDay("today")}
            >
              Today
            </Button>
            <Button
              variant={day === "tomorrow" ? "default" : "outline"}
              className={cn("flex-1", day !== "tomorrow" && "border-border")}
              onClick={() => setDay("tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          {/* Stats Cards Row - Uniform height */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="stats-card bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/15">
              <div className="stats-card-icon bg-destructive/10">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
              </div>
              <div>
                <p className="stats-card-label">Live Now</p>
                <p className="stats-card-value text-destructive">{liveCount}</p>
              </div>
            </Card>
            <Card className="stats-card bg-gradient-to-br from-success/10 to-success/5 border-success/15">
              <div className="stats-card-icon bg-success/10">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-success" />
              </div>
              <div>
                <p className="stats-card-label">Accuracy</p>
                <p className="stats-card-value text-success">
                  {statsLoading ? "..." : `${stats.accuracy}%`}
                </p>
              </div>
            </Card>
            <Card className="stats-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15">
              <div className="stats-card-icon bg-primary/10">
                <Brain className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <p className="stats-card-label">Active</p>
                <p className="stats-card-value text-primary">
                  {statsLoading ? "..." : stats.pending}
                </p>
              </div>
            </Card>
            <Card className="stats-card bg-gradient-to-br from-accent/10 to-accent/5 border-accent/15">
              <div className="stats-card-icon bg-accent/10">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div>
                <p className="stats-card-label">Analyzed</p>
                <p className="stats-card-value text-accent">
                  {statsLoading ? "..." : totalAnalyzed.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* AI Accuracy Section */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">AI Accuracy</span>
                </div>
                <Badge className="bg-success/10 text-success border-success/20">
                  {stats.accuracy}%
                </Badge>
              </div>
              
              {/* Stats indicators */}
              <div className="flex items-center gap-4 md:gap-6 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-xs text-muted-foreground">Won</span>
                  <span className="text-sm font-semibold text-success">{stats.won}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-xs text-muted-foreground">Lost</span>
                  <span className="text-sm font-semibold text-destructive">{stats.lost}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                  <span className="text-sm font-semibold text-warning">{stats.pending}</span>
                </div>
              </div>

              {/* Visual accuracy bar */}
              {totalAnalyzed > 0 && (
                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
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
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <h2 className="text-lg font-semibold text-foreground">Featured Predictions</h2>
                <span className="text-xs text-muted-foreground ml-auto">Updated just now</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
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
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                All {day === "today" ? "Daily" : "Tomorrow's"} Predictions ({regularPredictions.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading predictions...</p>
              </div>
            ) : regularPredictions.length === 0 && featuredPredictions.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No predictions available for {day === "today" ? "today" : "tomorrow"}
                  {selectedLeague ? ` in ${selectedLeague}` : ""}
                </p>
              </div>
            ) : regularPredictions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  All predictions for this selection are featured above
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
