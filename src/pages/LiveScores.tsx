import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Zap, 
  RefreshCw, 
  Bell, 
  Clock, 
  Trophy, 
  Star, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MatchStatus = "live" | "upcoming" | "finished" | "halftime";
type DateFilter = "yesterday" | "today" | "tomorrow";
type StatusFilter = "all" | "live" | "upcoming" | "finished";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  startTime?: string;
  league: string;
  leagueCountry: string;
}

const mockMatches: Match[] = [
  // Premier League
  { id: "1", homeTeam: "Manchester United", awayTeam: "Liverpool", homeScore: 2, awayScore: 1, status: "live", minute: 67, league: "Premier League", leagueCountry: "England" },
  { id: "2", homeTeam: "Arsenal", awayTeam: "Chelsea", homeScore: 1, awayScore: 1, status: "halftime", league: "Premier League", leagueCountry: "England" },
  { id: "3", homeTeam: "Manchester City", awayTeam: "Tottenham", homeScore: null, awayScore: null, status: "upcoming", startTime: "15:00", league: "Premier League", leagueCountry: "England" },
  // La Liga
  { id: "4", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeScore: 3, awayScore: 2, status: "live", minute: 82, league: "La Liga", leagueCountry: "Spain" },
  { id: "5", homeTeam: "Atletico Madrid", awayTeam: "Sevilla", homeScore: 2, awayScore: 0, status: "finished", league: "La Liga", leagueCountry: "Spain" },
  // Bundesliga
  { id: "6", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", homeScore: 1, awayScore: 0, status: "live", minute: 34, league: "Bundesliga", leagueCountry: "Germany" },
  { id: "7", homeTeam: "RB Leipzig", awayTeam: "Bayer Leverkusen", homeScore: null, awayScore: null, status: "upcoming", startTime: "17:30", league: "Bundesliga", leagueCountry: "Germany" },
  // Serie A
  { id: "8", homeTeam: "AC Milan", awayTeam: "Inter Milan", homeScore: 0, awayScore: 0, status: "live", minute: 12, league: "Serie A", leagueCountry: "Italy" },
  { id: "9", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 1, awayScore: 2, status: "finished", league: "Serie A", leagueCountry: "Italy" },
  // Champions League
  { id: "10", homeTeam: "PSG", awayTeam: "Man City", homeScore: null, awayScore: null, status: "upcoming", startTime: "20:00", league: "Champions League", leagueCountry: "Europe" },
];

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
  const [activeLeague, setActiveLeague] = useState("All Leagues");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const currentTime = new Date().toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setShowSuccess(false);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLastUpdated(new Date());
    setIsRefreshing(false);
    setShowSuccess(true);
    
    toast({
      title: "Scores Updated",
      description: "Live scores have been refreshed successfully.",
    });
    
    // Hide success indicator after 2 seconds
    setTimeout(() => setShowSuccess(false), 2000);
  }, [toast]);

  const getDateLabel = (filter: DateFilter) => {
    const today = new Date();
    const date = new Date(today);
    
    if (filter === "yesterday") date.setDate(date.getDate() - 1);
    if (filter === "tomorrow") date.setDate(date.getDate() + 1);
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredMatches = mockMatches.filter((match) => {
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

  const groupedMatches = filteredMatches.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = [];
    acc[match.league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const liveCount = mockMatches.filter(m => m.status === "live" || m.status === "halftime").length;
  const totalCount = mockMatches.length;
  const leagueCount = new Set(mockMatches.map(m => m.league)).size;

  const toggleFavorite = (matchId: string) => {
    setFavorites(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case "live":
        return (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {match.minute}'
          </Badge>
        );
      case "halftime":
        return (
          <Badge variant="secondary" className="bg-accent/20 text-accent">
            HT
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            FT
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground">
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
                    isRefreshing && "bg-primary/10 border-primary"
                  )}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isRefreshing && "animate-spin text-primary"
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                {(["yesterday", "today", "tomorrow"] as DateFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={cn(
                      "px-4 py-2 rounded-md transition-all flex flex-col items-center min-w-[80px]",
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
              ] as { key: StatusFilter; label: string; badge?: boolean }[]).map((filter) => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key)}
                  className={cn(
                    "gap-2",
                    statusFilter === filter.key 
                      ? "bg-primary text-primary-foreground" 
                      : "border-border hover:bg-muted"
                  )}
                >
                  {filter.label}
                  {filter.badge && (
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Match List */}
        {Object.keys(groupedMatches).length > 0 ? (
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
                      className={cn(
                        "px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors",
                        (match.status === "live" || match.status === "halftime") && "bg-primary/5"
                      )}
                    >
                      {/* Favorite */}
                      <button
                        onClick={() => toggleFavorite(match.id)}
                        className="shrink-0"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition-colors",
                            favorites.includes(match.id)
                              ? "fill-accent text-accent"
                              : "text-muted-foreground hover:text-accent"
                          )}
                        />
                      </button>

                      {/* Match Info */}
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                        {/* Home Team */}
                        <div className="text-right">
                          <span className="font-medium text-foreground truncate block">
                            {match.homeTeam}
                          </span>
                        </div>

                        {/* Score / Time */}
                        <div className="flex flex-col items-center px-3">
                          {match.status === "upcoming" ? (
                            <span className="text-sm text-muted-foreground">
                              {match.startTime}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" || match.status === "halftime"
                                  ? "text-primary"
                                  : "text-foreground"
                              )}>
                                {match.homeScore}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" || match.status === "halftime"
                                  ? "text-primary"
                                  : "text-foreground"
                              )}>
                                {match.awayScore}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="text-left">
                          <span className="font-medium text-foreground truncate block">
                            {match.awayTeam}
                          </span>
                        </div>
                      </div>

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
        ) : (
          /* Empty State */
          <Card className="p-12 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">No live matches available</p>
                <p className="text-sm text-muted-foreground">Check back soon for upcoming games</p>
              </div>
              <Button variant="outline" className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
