import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Zap, 
  RefreshCw, 
  Search, 
  Star, 
  Loader2, 
  Bell, 
  Clock,
  Play,
  BarChart3,
  Trophy,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLiveScores, type Match } from "@/hooks/useLiveScores";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate } from "react-router-dom";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { MatchAlertsModal } from "@/components/live-scores/MatchAlertsModal";
import { format, addDays, subDays } from "date-fns";

type StatusFilter = "all" | "live" | "upcoming" | "finished";
type DateFilter = "yesterday" | "today" | "tomorrow";

const LEAGUES = [
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
  const { matches, isLoading, error, refetch } = useLiveScores();
  const { isFavorite, toggleFavorite, isSaving } = useFavorites();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  
  // Modals
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertsMatch, setAlertsMatch] = useState<Match | null>(null);

  // Stats
  const stats = useMemo(() => {
    const liveCount = matches.filter(m => m.status === "LIVE" || m.status === "HT").length;
    const totalCount = matches.length;
    const leagues = new Set(matches.map(m => m.league)).size;
    return { liveCount, totalCount, leagues };
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Status filter
      if (statusFilter === "live" && m.status !== "LIVE" && m.status !== "HT") return false;
      if (statusFilter === "finished" && m.status !== "FT") return false;
      if (statusFilter === "upcoming" && m.status !== "NS") return false;

      // League filter
      if (leagueFilter !== "All Leagues" && !m.league.toLowerCase().includes(leagueFilter.toLowerCase())) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matches, statusFilter, leagueFilter, searchQuery]);

  // Group by league
  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce(
      (acc, match) => {
        if (!acc[match.league]) acc[match.league] = [];
        acc[match.league].push(match);
        return acc;
      },
      {} as Record<string, Match[]>,
    );
  }, [filteredMatches]);

  const getStatusBadge = (m: Match) => {
    if (m.status === "LIVE") {
      return (
        <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          LIVE {m.minute}'
        </Badge>
      );
    }
    if (m.status === "HT") {
      return <Badge className="bg-warning/20 text-warning border-warning/30">HT</Badge>;
    }
    if (m.status === "FT") {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">FT</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">{m.startTime ?? "—"}</Badge>;
  };

  const handleRefresh = useCallback(async () => {
    await refetch();
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2000);
  }, [refetch]);

  const currentTime = format(new Date(), "HH:mm");

  // Date options
  const dateOptions = [
    { key: "yesterday" as DateFilter, label: "Yesterday", date: format(subDays(new Date(), 1), "MMM d") },
    { key: "today" as DateFilter, label: "Today", date: format(new Date(), "MMM d") },
    { key: "tomorrow" as DateFilter, label: "Tomorrow", date: format(addDays(new Date(), 1), "MMM d") },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Live Scores</h1>
              <p className="text-sm text-muted-foreground">Real-time match updates • Pull down to refresh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Current Time Badge */}
            <Badge variant="secondary" className="gap-1.5 bg-secondary/80">
              <Clock className="h-3 w-3" />
              {currentTime}
            </Badge>
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              className="hover:border-primary hover:text-primary transition-colors"
            >
              {refreshSuccess ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              )}
            </Button>
            
            {/* Alerts Button */}
            <Button 
              size="icon"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setAlertsMatch(matches[0] || null)}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Live Now */}
          <Card className="p-4 bg-card border-border/50 hover:border-destructive/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Play className="h-4 w-4 text-destructive fill-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.liveCount}</p>
                <p className="text-xs text-muted-foreground">Live Now</p>
              </div>
            </div>
          </Card>
          
          {/* Total Matches */}
          <Card className="p-4 bg-card border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </Card>
          
          {/* Leagues */}
          <Card className="p-4 bg-card border-border/50 hover:border-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Trophy className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{stats.leagues}</p>
                <p className="text-xs text-muted-foreground">Leagues</p>
              </div>
            </div>
          </Card>
        </div>

        {/* League Filter Pills */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {LEAGUES.map((league) => (
              <Button
                key={league}
                size="sm"
                variant={leagueFilter === league ? "default" : "outline"}
                onClick={() => setLeagueFilter(league)}
                className={cn(
                  "shrink-0 rounded-full",
                  leagueFilter === league 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "border-border/50 text-foreground hover:bg-primary/10 hover:border-primary/30"
                )}
              >
                {league}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2 flex-1 justify-center">
            {dateOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={dateFilter === opt.key ? "default" : "outline"}
                onClick={() => setDateFilter(opt.key)}
                className={cn(
                  "flex flex-col h-auto py-2 px-4 min-w-[80px]",
                  dateFilter === opt.key 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border/50 hover:bg-primary/10"
                )}
              >
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.date}</span>
              </Button>
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
            placeholder="Search teams, leagues, countries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50 focus:border-primary"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 p-1 bg-card rounded-lg border border-border/50">
          {([
            { key: "all", label: "All Matches", icon: Trophy },
            { key: "live", label: "Live Now", icon: Play, badge: stats.liveCount > 0 },
            { key: "upcoming", label: "Upcoming", icon: Clock },
            { key: "finished", label: "Finished", icon: Check },
          ] as { key: StatusFilter; label: string; icon: any; badge?: boolean }[]).map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant="ghost"
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "flex-1 gap-2 relative",
                statusFilter === tab.key 
                  ? "bg-secondary text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn(
                "h-4 w-4",
                tab.key === "live" && tab.badge && "text-destructive"
              )} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.key === "live" && tab.badge && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              )}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="p-12 text-center bg-card border-border/50">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-3">Loading matches...</p>
          </Card>
        ) : error ? (
          <Card className="p-12 text-center bg-card border-border/50">
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={handleRefresh}>
              Retry
            </Button>
          </Card>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <Card className="p-12 text-center bg-card border-border/50">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-3">No matches found</p>
            <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
          </Card>
        ) : (
          Object.entries(groupedMatches).map(([league, items]) => (
            <Card key={league} className="overflow-hidden bg-card border-border/50">
              {/* League Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{league}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {items.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">Live sync enabled</span>
                </div>
              </div>

              {/* Match Rows */}
              <div className="divide-y divide-border/30">
                {items.map((m) => (
                  <div 
                    key={m.id} 
                    className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedMatch(m)}
                  >
                    {/* Favorite */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(String(m.id), navigate);
                      }}
                      disabled={isSaving(String(m.id))}
                      className="shrink-0"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isFavorite(String(m.id)) 
                            ? "fill-primary text-primary" 
                            : "text-muted-foreground hover:text-primary"
                        )}
                      />
                    </button>

                    {/* Teams & Score */}
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span className="text-right text-sm text-foreground truncate">{m.homeTeam}</span>
                      <span className={cn(
                        "font-bold px-3 py-1 rounded text-center min-w-[60px]",
                        (m.status === "LIVE" || m.status === "HT") 
                          ? "bg-primary/10 text-primary" 
                          : "text-foreground"
                      )}>
                        {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                      </span>
                      <span className="text-left text-sm text-foreground truncate">{m.awayTeam}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {getStatusBadge(m)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      <MatchDetailModal 
        match={selectedMatch ? {
          ...selectedMatch,
          status: selectedMatch.status === "LIVE" ? "live" 
            : selectedMatch.status === "HT" ? "halftime" 
            : selectedMatch.status === "FT" ? "finished" 
            : "upcoming",
          leagueCountry: "",
        } : null} 
        onClose={() => setSelectedMatch(null)} 
      />
      
      <MatchAlertsModal 
        match={alertsMatch ? {
          id: String(alertsMatch.id),
          homeTeam: alertsMatch.homeTeam,
          awayTeam: alertsMatch.awayTeam,
        } : null} 
        onClose={() => setAlertsMatch(null)} 
      />
    </DashboardLayout>
  );
}
