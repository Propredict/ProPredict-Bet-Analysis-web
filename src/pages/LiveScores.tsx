import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Zap, 
  RefreshCw, 
  Star, 
  Loader2, 
  Bell, 
  Search, 
  Play, 
  BarChart3, 
  Trophy,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { useFavorites } from "@/hooks/useFavorites";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { MatchAlertsModal } from "@/components/live-scores/MatchAlertsModal";
import { format, addDays, subDays } from "date-fns";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

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

// Generate date options
function getDateOptions() {
  const today = new Date();
  return [
    { label: "Yesterday", date: subDays(today, 1), key: "yesterday" },
    { label: "Today", date: today, key: "today" },
    { label: "Tomorrow", date: addDays(today, 1), key: "tomorrow" },
    { label: format(addDays(today, 2), "MMM d"), date: addDays(today, 2), key: "day2" },
    { label: format(addDays(today, 3), "MMM d"), date: addDays(today, 3), key: "day3" },
  ];
}

// Live timer component - updates seconds locally
function LiveTimer({ minute }: { minute: number | null }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s + 1) % 60);
    }, 1000);
    return () => clearInterval(interval);
  }, [minute]);

  return (
    <Badge className="bg-destructive text-destructive-foreground animate-pulse font-mono text-xs">
      LIVE {minute ?? 0}:{seconds.toString().padStart(2, "0")}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return <LiveTimer minute={match.minute} />;
  }
  
  if (match.status === "halftime") {
    return (
      <Badge className="bg-warning text-warning-foreground font-medium">
        HT
      </Badge>
    );
  }
  
  if (match.status === "finished") {
    return (
      <Badge variant="secondary" className="font-medium">
        FT
      </Badge>
    );
  }
  
  // Upcoming
  return (
    <Badge variant="outline" className="text-muted-foreground font-medium">
      {match.startTime}
    </Badge>
  );
}

export default function LiveScores() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [selectedDate, setSelectedDate] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Get the date mode for API
  const dateMode = useMemo(() => {
    if (selectedDate === "yesterday") return "yesterday";
    if (selectedDate === "tomorrow") return "tomorrow";
    return "today";
  }, [selectedDate]);

  const { matches, isLoading, error, refetch } = useLiveScores(dateMode);
  const { isFavorite, toggleFavorite, isSaving } = useFavorites();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const dateOptions = useMemo(() => getDateOptions(), []);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Status filter
      if (statusFilter === "live" && m.status !== "live" && m.status !== "halftime") return false;
      if (statusFilter === "upcoming" && m.status !== "upcoming") return false;
      if (statusFilter === "finished" && m.status !== "finished") return false;

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
          m.league.toLowerCase().includes(q) ||
          m.leagueCountry.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [matches, statusFilter, leagueFilter, searchQuery]);

  // Group by league
  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce((acc, match) => {
      if (!acc[match.league]) acc[match.league] = [];
      acc[match.league].push(match);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filteredMatches]);

  // Stats
  const stats = useMemo(() => {
    const liveCount = matches.filter((m) => m.status === "live" || m.status === "halftime").length;
    const uniqueLeagues = new Set(matches.map((m) => m.league)).size;
    return {
      live: liveCount,
      total: matches.length,
      leagues: uniqueLeagues,
    };
  }, [matches]);

  // Handle favorite toggle without opening modal
  const handleFavoriteClick = useCallback((e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    toggleFavorite(matchId);
  }, [toggleFavorite]);

  // Handle match row click
  const handleMatchClick = useCallback((match: Match) => {
    // Convert status to modal format
    const modalMatch = {
      ...match,
      status: match.status as "live" | "upcoming" | "finished" | "halftime",
    };
    setSelectedMatch(modalMatch);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Live Scores</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time match updates • Pull down to refresh
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Current time */}
            <Badge variant="secondary" className="font-mono">
              <Clock className="h-3 w-3 mr-1" />
              {format(currentTime, "HH:mm")}
            </Badge>

            {/* Refresh */}
            <Button 
              size="icon" 
              variant="outline" 
              onClick={refetch}
              className="hover:border-primary hover:text-primary"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>

            {/* Alerts */}
            <Button 
              size="icon"
              onClick={() => setShowAlertsModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Live Now */}
          <Card className="p-4 border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-destructive/10",
                stats.live > 0 && "animate-pulse"
              )}>
                <Play className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.live}</p>
                <p className="text-xs text-muted-foreground">Live Now</p>
              </div>
            </div>
          </Card>

          {/* Total Matches */}
          <Card className="p-4 border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </Card>

          {/* Leagues */}
          <Card className="p-4 border-border/50">
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
                  "shrink-0",
                  leagueFilter === league 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10 hover:text-primary hover:border-primary"
                )}
              >
                {league}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Date Selector */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {dateOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={selectedDate === opt.key ? "default" : "outline"}
                onClick={() => setSelectedDate(opt.key)}
                className={cn(
                  "shrink-0 flex-col h-auto py-2 px-4",
                  selectedDate === opt.key 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10"
                )}
              >
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] opacity-70">{format(opt.date, "MMM d")}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams, leagues, countries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 p-1 bg-card rounded-lg border border-border">
          {[
            { key: "all" as const, label: "All Matches", icon: Trophy },
            { key: "live" as const, label: "Live Now", icon: Play, badge: stats.live },
            { key: "upcoming" as const, label: "Upcoming", icon: Clock },
            { key: "finished" as const, label: "Finished", icon: BarChart3 },
          ].map(({ key, label, icon: Icon, badge }) => (
            <Button
              key={key}
              size="sm"
              variant="ghost"
              onClick={() => setStatusFilter(key)}
              className={cn(
                "flex-1 gap-1.5",
                statusFilter === key 
                  ? "bg-secondary text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {badge !== undefined && badge > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading matches...</p>
          </Card>
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={refetch} className="mt-4">
              Try Again
            </Button>
          </Card>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No matches found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMatches).map(([league, leagueMatches]) => (
              <Card key={league} className="overflow-hidden border-border/50">
                {/* League Header */}
                <div className="px-4 py-3 bg-secondary/30 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{league}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {leagueMatches.length}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Live sync enabled</span>
                  </div>
                </div>

                {/* Matches */}
                <div className="divide-y divide-border/30">
                  {leagueMatches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => handleMatchClick(match)}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 cursor-pointer transition-colors"
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleFavoriteClick(e, match.id)}
                        disabled={isSaving(match.id)}
                        className="shrink-0"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isFavorite(match.id)
                              ? "fill-primary text-primary"
                              : "text-muted-foreground hover:text-primary"
                          )}
                        />
                      </button>

                      {/* Teams & Score */}
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                        <span className="text-right truncate font-medium">
                          {match.homeTeam}
                        </span>
                        <span className="px-3 py-1 bg-secondary/50 rounded font-bold text-lg tabular-nums">
                          {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                        </span>
                        <span className="truncate font-medium">
                          {match.awayTeam}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge match={match} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <MatchDetailModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />
      {showAlertsModal && (
        <MatchAlertsModal
          match={{ id: "global", homeTeam: "All", awayTeam: "Matches" }}
          onClose={() => setShowAlertsModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
