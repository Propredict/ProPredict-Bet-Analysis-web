import { useMemo, useState, useEffect } from "react";
import { Zap, RefreshCw, Bell, Star, Search, Play, Trophy, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { MatchAlertsModal } from "@/components/live-scores/MatchAlertsModal";
import { useFavorites } from "@/hooks/useFavorites";
import { format, subDays, addDays } from "date-fns";

type StatusTab = "all" | "live" | "upcoming" | "finished";

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

type DateOption = "yesterday" | "today" | "tomorrow";

export default function LiveScores() {
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [dateOption, setDateOption] = useState<DateOption>("today");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertsMatch, setAlertsMatch] = useState<Match | null>(null);

  const { matches, isLoading, error, refetch } = useLiveScores(statusTab);
  const { favorites, toggleFavorite } = useFavorites();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Derived counts from matches array
  const liveCount = useMemo(
    () => matches.filter((m) => m.status === "live" || m.status === "halftime").length,
    [matches]
  );

  const uniqueLeagues = useMemo(
    () => new Set(matches.map((m) => m.league)).size,
    [matches]
  );

  // Filter matches by search and league
  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q) ||
        m.leagueCountry?.toLowerCase().includes(q);

      const matchesLeague =
        leagueFilter === "All Leagues" || m.league.includes(leagueFilter);

      return matchesSearch && matchesLeague;
    });
  }, [matches, search, leagueFilter]);

  // Group by league
  const grouped = useMemo(() => {
    return filtered.reduce(
      (acc, m) => {
        acc[m.league] ??= [];
        acc[m.league].push(m);
        return acc;
      },
      {} as Record<string, Match[]>
    );
  }, [filtered]);

  const handleRefresh = () => {
    refetch();
  };

  const handleFavoriteClick = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    toggleFavorite(matchId);
  };

  const getDateLabel = (option: DateOption) => {
    const today = new Date();
    switch (option) {
      case "yesterday":
        return format(subDays(today, 1), "MMM d");
      case "today":
        return format(today, "MMM d");
      case "tomorrow":
        return format(addDays(today, 1), "MMM d");
    }
  };

  // Status tabs configuration
  const statusTabs: Array<{
    value: StatusTab;
    label: string;
    shortLabel: string;
    icon: typeof Trophy | typeof Play | null;
    showBadge: boolean;
  }> = [
    { value: "all", label: "All Matches", shortLabel: "All", icon: Trophy, showBadge: false },
    { value: "live", label: "Live Now", shortLabel: "Live", icon: Play, showBadge: true },
    { value: "upcoming", label: "Upcoming", shortLabel: "Soon", icon: null, showBadge: false },
    { value: "finished", label: "Finished", shortLabel: "Done", icon: null, showBadge: false },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-4 bg-[#0B1220]/95 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Live Scores</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time match updates • Pull down to refresh
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Current time badge */}
              <Badge 
                variant="outline" 
                className="bg-[#0F172A] border-white/10 text-muted-foreground font-mono"
              >
                {format(currentTime, "HH:mm")}
              </Badge>

              {/* Refresh button */}
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh}
                className="border-white/10 hover:bg-primary/10 hover:border-primary/50"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>

              {/* Alerts button */}
              <Button 
                onClick={() => {
                  // Open alerts for the first live match, or first match if none live
                  const firstMatch = matches.find(m => m.status === "live") || matches[0];
                  if (firstMatch) setAlertsMatch(firstMatch);
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Bell className="h-4 w-4 mr-1.5" />
                Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-3 gap-4">
          {/* Live Now */}
          <Card className="p-4 bg-[#0F172A] border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Live Now</p>
                <p className="text-2xl font-bold text-destructive mt-1">{liveCount}</p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                "bg-destructive/10",
                liveCount > 0 && "animate-pulse"
              )}>
                <Play className="h-5 w-5 text-destructive fill-destructive" />
              </div>
            </div>
          </Card>

          {/* Total Matches */}
          <Card className="p-4 bg-[#0F172A] border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Matches</p>
                <p className="text-2xl font-bold text-primary mt-1">{matches.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>

          {/* Leagues */}
          <Card className="p-4 bg-[#0F172A] border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Leagues</p>
                <p className="text-2xl font-bold text-warning mt-1">{uniqueLeagues}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-warning" />
              </div>
            </div>
          </Card>
        </div>

        {/* LEAGUE FILTER PILLS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {LEAGUES.map((league) => (
            <Button
              key={league}
              size="sm"
              variant={leagueFilter === league ? "default" : "outline"}
              onClick={() => setLeagueFilter(league)}
              className={cn(
                "whitespace-nowrap shrink-0 transition-all",
                leagueFilter === league
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-white/10 text-muted-foreground hover:bg-primary/10 hover:text-foreground hover:border-primary/30"
              )}
            >
              {league}
            </Button>
          ))}
        </div>

        {/* DATE SELECTOR */}
        <div className="flex gap-2">
          {(["yesterday", "today", "tomorrow"] as DateOption[]).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={dateOption === option ? "default" : "outline"}
              onClick={() => setDateOption(option)}
              className={cn(
                "flex-1 flex-col h-auto py-2",
                dateOption === option
                  ? "bg-primary text-primary-foreground"
                  : "border-white/10 text-muted-foreground hover:bg-primary/10"
              )}
            >
              <span className="capitalize text-xs">{option}</span>
              <span className="text-[10px] opacity-70">{getDateLabel(option)}</span>
            </Button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams, leagues, countries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0F172A] border-white/10 focus:border-primary/50 focus:ring-primary/20"
          />
        </div>

        {/* STATUS FILTER TABS */}
        <div className="flex gap-1 p-1 bg-[#0F172A] rounded-lg border border-white/5">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant="ghost"
              onClick={() => setStatusTab(tab.value)}
              className={cn(
                "flex-1 gap-1.5 transition-all",
                statusTab === tab.value
                  ? "bg-[#1E293B] text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {tab.showBadge && liveCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground h-5 px-1.5 text-[10px]">
                  {liveCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* LOADING / ERROR STATES */}
        {isLoading && !matches.length && (
          <Card className="p-10 text-center bg-[#0F172A] border-white/5">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading matches…</p>
          </Card>
        )}

        {error && (
          <Card className="p-10 text-center bg-[#0F172A] border-destructive/20">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Auto-refresh indicator */}
        {isLoading && matches.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Updating…</span>
          </div>
        )}

        {/* MATCH LIST GROUPED BY LEAGUE */}
        {Object.entries(grouped).map(([league, games]) => (
          <Card key={league} className="bg-[#0F172A] border-white/5 overflow-hidden">
            {/* League Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#0B1220]/50">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{league}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Live sync enabled</span>
                <Badge variant="secondary" className="bg-white/5 text-muted-foreground">
                  {games.length}
                </Badge>
              </div>
            </div>

            {/* Match Rows */}
            <div className="divide-y divide-white/5">
              {games.map((m) => {
                const isFavorite = favorites.has(m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    {/* Favorite Star */}
                    <button
                      onClick={(e) => handleFavoriteClick(e, m.id)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isFavorite
                            ? "text-primary fill-primary"
                            : "text-muted-foreground hover:text-primary"
                        )}
                      />
                    </button>

                    {/* Teams and Score */}
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span className="text-right text-sm font-medium text-foreground truncate">
                        {m.homeTeam}
                      </span>
                      <span className="font-bold text-lg px-3 text-center min-w-[60px]">
                        {m.status === "upcoming" ? (
                          <span className="text-muted-foreground text-sm">vs</span>
                        ) : (
                          <>
                            {m.homeScore ?? 0}
                            <span className="text-muted-foreground mx-1">-</span>
                            {m.awayScore ?? 0}
                          </>
                        )}
                      </span>
                      <span className="text-left text-sm font-medium text-foreground truncate">
                        {m.awayTeam}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <StatusBadge match={m} />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        {/* Empty state */}
        {!isLoading && !error && Object.keys(grouped).length === 0 && (
          <Card className="p-10 text-center bg-[#0F172A] border-white/5">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No matches found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters or search
            </p>
          </Card>
        )}
      </div>

      {/* Modals */}
      <MatchDetailModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />

      <MatchAlertsModal
        match={alertsMatch}
        onClose={() => setAlertsMatch(null)}
      />
    </DashboardLayout>
  );
}

/* Status Badge Component */
function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return (
      <Badge className="bg-destructive/90 text-destructive-foreground animate-pulse min-w-[80px] justify-center">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
        LIVE {match.minute}'
      </Badge>
    );
  }

  if (match.status === "halftime") {
    return (
      <Badge className="bg-warning text-warning-foreground min-w-[50px] justify-center">
        HT
      </Badge>
    );
  }

  if (match.status === "finished") {
    return (
      <Badge variant="secondary" className="bg-white/10 text-muted-foreground min-w-[50px] justify-center">
        FT
      </Badge>
    );
  }

  // Upcoming
  return (
    <Badge variant="outline" className="border-white/20 text-muted-foreground min-w-[60px] justify-center">
      {match.startTime}
    </Badge>
  );
}
