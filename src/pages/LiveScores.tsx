import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Zap, 
  RefreshCw, 
  Bell, 
  BellRing,
  Clock, 
  Trophy, 
  Star, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { MatchAlertsModal } from "@/components/live-scores/MatchAlertsModal";
import { useMatchAlerts } from "@/hooks/useMatchAlerts";
import { useFavorites } from "@/hooks/useFavorites";
import { useFixtures, type DateFilter, type Match } from "@/hooks/useFixtures";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

const leagues = [
  "All Leagues",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Champions League",
  "Europa League",
];


export default function LiveScores() {
  const navigate = useNavigate();
  const [activeLeague, setActiveLeague] = useState("All Leagues");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertMatch, setAlertMatch] = useState<Match | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { toast } = useToast();
  const { hasAlert, refetch: refetchAlerts } = useMatchAlerts();
  const { isFavorite, isSaving, toggleFavorite } = useFavorites();
  
  // Determine if we should fetch live only (Today + Live Now filter)
  const fetchLiveOnly = dateFilter === "today" && statusFilter === "live";
  
  // Fetch fixtures based on date filter and live mode
  const { matches, isLoading, error, refetch, silentRefetch } = useFixtures(dateFilter, fetchLiveOnly);
  
  // Auto-refresh interval ref
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh logic: only when fetchLiveOnly is true and no modal is open
  useEffect(() => {
    const shouldAutoRefresh = fetchLiveOnly && !selectedMatch;

    if (shouldAutoRefresh) {
      autoRefreshRef.current = setInterval(async () => {
        await silentRefetch();
        setLastUpdated(new Date());
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [fetchLiveOnly, selectedMatch, silentRefetch]);

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const handleRefresh = useCallback(async () => {
    setShowSuccess(false);
    await refetch();
    setLastUpdated(new Date());
    setShowSuccess(true);
    
    toast({
      title: "Scores Updated",
      description: "Live scores have been refreshed successfully.",
    });
    
    // Hide success indicator after 2 seconds
    setTimeout(() => setShowSuccess(false), 2000);
  }, [refetch, toast]);

  const getDateLabel = (filter: DateFilter) => {
    const today = new Date();
    const date = new Date(today);
    
    if (filter === "yesterday") date.setDate(date.getDate() - 1);
    if (filter === "tomorrow") date.setDate(date.getDate() + 1);
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Reset status filter to "all" when switching away from Today
  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    // Disable live filter when not on Today
    if (filter !== "today" && statusFilter === "live") {
      setStatusFilter("all");
    }
  };

  // Check if live filter should be disabled
  const isLiveFilterDisabled = dateFilter !== "today";

  // Filter matches based on UI filters
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (activeLeague !== "All Leagues" && match.league !== activeLeague) return false;
      if (statusFilter === "live" && match.status !== "live" && match.status !== "halftime") return false;
      if (statusFilter === "upcoming" && match.status !== "upcoming") return false;
      if (statusFilter === "finished" && match.status !== "finished") return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          match.homeTeam.toLowerCase().includes(query) ||
          match.awayTeam.toLowerCase().includes(query) ||
          match.league.toLowerCase().includes(query) ||
          match.leagueCountry.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [matches, activeLeague, statusFilter, searchQuery]);

  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce((acc, match) => {
      if (!acc[match.league]) acc[match.league] = [];
      acc[match.league].push(match);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filteredMatches]);

  const liveCount = matches.filter(m => m.status === "live" || m.status === "halftime").length;
  const totalCount = matches.length;
  const leagueCount = new Set(matches.map(m => m.league)).size;


  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case "live":
        return (
          <Badge className="bg-destructive text-destructive-foreground gap-1.5 font-semibold shadow-lg shadow-destructive/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
            </span>
            LIVE {match.minute}'
          </Badge>
        );
      case "halftime":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 font-semibold">
            HT
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-medium">
            FT
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-medium">
            {match.startTime}
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sticky Header Container */}
        <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-6 pt-6 pb-4 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-background/20">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Live Scores</h1>
                  <p className="text-sm text-muted-foreground">Real-time match updates · Pull down to refresh</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1.5 border-border transition-all duration-300",
                    showSuccess && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  {showSuccess ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {showSuccess ? "Updated!" : `Updated ${formatLastUpdated(lastUpdated)}`}
                </Badge>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn(
                    "h-9 w-9 transition-all duration-200",
                    isLoading && "bg-primary/10 border-primary"
                  )}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isLoading && "animate-spin text-primary"
                    )} 
                  />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* League Filter Tabs */}
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {leagues.map((league) => (
                  <Button
                    key={league}
                    variant={activeLeague === league ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveLeague(league)}
                    className={cn(
                      "rounded-full shrink-0",
                      activeLeague === league 
                        ? "bg-primary text-primary-foreground" 
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {league}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Date Selector */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                {(["yesterday", "today", "tomorrow"] as DateFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleDateFilterChange(filter)}
                    className={cn(
                      "px-4 py-2 rounded-md transition-all flex flex-col items-center min-w-[70px]",
                      dateFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-sm font-medium capitalize">{filter}</span>
                    <span className="text-xs opacity-70">{getDateLabel(filter)}</span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams, leagues, countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            {/* Match Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {([
                { key: "all", label: "All Matches" },
                { key: "live", label: "Live Now", badge: true },
                { key: "upcoming", label: "Upcoming" },
                { key: "finished", label: "Finished" },
              ] as { key: StatusFilter; label: string; badge?: boolean }[]).map((filter) => {
                const isDisabled = filter.key === "live" && isLiveFilterDisabled;
                return (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => !isDisabled && setStatusFilter(filter.key)}
                    disabled={isDisabled}
                    className={cn(
                      "gap-2",
                      statusFilter === filter.key 
                        ? "bg-primary text-primary-foreground" 
                        : "border-border hover:bg-muted",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {filter.label}
                    {filter.badge && !isDisabled && (
                      <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading fixtures...</p>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="p-12 bg-card border-destructive/50 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <Zap className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Failed to load fixtures</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Match List */}
        {!isLoading && !error && Object.keys(groupedMatches).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedMatches).map(([league, matches]) => (
              <Card key={league} className="bg-card border-border overflow-hidden">
                {/* League Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{league}</span>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {matches.length} {matches.length === 1 ? "match" : "matches"}
                  </Badge>
                </div>

                {/* Matches */}
                <div className="divide-y divide-border">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      className={cn(
                        "px-4 py-3 flex items-center gap-4 transition-all cursor-pointer",
                        "hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995]",
                        match.status === "live" && "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive",
                        match.status === "halftime" && "bg-yellow-500/5 hover:bg-yellow-500/10 border-l-2 border-l-yellow-500",
                        match.status === "finished" && "opacity-60 hover:opacity-80"
                      )}
                    >
                      {/* Favorite */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(match.id, navigate);
                        }}
                        disabled={isSaving(match.id)}
                        className="shrink-0 p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        {isSaving(match.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        ) : (
                          <Star
                            className={cn(
                              "h-4 w-4 transition-all duration-200",
                              isFavorite(match.id)
                                ? "fill-accent text-accent scale-110"
                                : "text-muted-foreground hover:text-accent hover:scale-110"
                            )}
                          />
                        )}
                      </button>

                      {/* Match Info */}
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                        {/* Home Team */}
                        <div className="text-right">
                          <span className={cn(
                            "font-medium truncate block",
                            match.status === "finished" ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {match.homeTeam}
                          </span>
                        </div>

                        {/* Score / Time */}
                        <div className="flex flex-col items-center px-3">
                          {match.status === "upcoming" ? (
                            <span className="text-lg font-bold text-muted-foreground">
                              – : –
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" ? "text-destructive" :
                                match.status === "halftime" ? "text-yellow-500" :
                                match.status === "finished" ? "text-muted-foreground" : "text-foreground"
                              )}>
                                {match.homeScore}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" ? "text-destructive" :
                                match.status === "halftime" ? "text-yellow-500" :
                                match.status === "finished" ? "text-muted-foreground" : "text-foreground"
                              )}>
                                {match.awayScore}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="text-left">
                          <span className={cn(
                            "font-medium truncate block",
                            match.status === "finished" ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {match.awayTeam}
                          </span>
                        </div>
                      </div>

                      {/* Alert Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlertMatch(match);
                        }}
                        className="shrink-0 p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors"
                      >
                        {hasAlert(match.id) ? (
                          <BellRing className="h-4 w-4 text-primary" />
                        ) : (
                          <Bell className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {getStatusBadge(match)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : !isLoading && !error ? (
          /* Empty State */
          <Card className="p-12 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  {fetchLiveOnly ? "No live matches right now" : "No matches found"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {fetchLiveOnly 
                    ? "Check back soon or view all Today's matches" 
                    : "Try a different date or adjust your filters"}
                </p>
              </div>
              <Button variant="outline" className="mt-2" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Card>
        ) : null}
        {/* Match Detail Modal */}
        <MatchDetailModal 
          match={selectedMatch} 
          onClose={() => setSelectedMatch(null)} 
        />

        {/* Match Alerts Modal */}
        <MatchAlertsModal 
          match={alertMatch} 
          onClose={() => {
            setAlertMatch(null);
            refetchAlerts();
          }} 
        />
      </div>
    </DashboardLayout>
  );
}
