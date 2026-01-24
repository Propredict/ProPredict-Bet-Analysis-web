import {
  Zap,
  RefreshCw,
  Star,
  Search,
  Play,
  Trophy,
  BarChart3,
  Clock,
  CheckCircle,
  Heart,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";

import { MatchAlertButton } from "@/components/live-scores/MatchAlertButton";
import { KickoffCountdown } from "@/components/live-scores/KickoffCountdown";
import { LiveScoresFallback } from "@/components/live-scores/LiveScoresFallback";
import { useFavorites } from "@/hooks/useFavorites";

import { useMatchAlertPreferences } from "@/hooks/useMatchAlertPreferences";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { format, subDays, addDays } from "date-fns";

/* -------------------- CONSTANTS -------------------- */

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

type StatusTab = "all" | "live" | "upcoming" | "finished";
type DateMode = "yesterday" | "today" | "tomorrow";

/* -------------------- PAGE -------------------- */

export default function LiveScores() {
  console.log("🔥 LiveScores mounted");
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const { matches, isLoading, error, refetch } = useLiveScores({
    dateMode,
    statusFilter: statusTab,
  });

  const { isFavorite, toggleFavorite } = useFavorites();
  
  const { hasAlert, toggleMatchAlert } = useMatchAlertPreferences();

  // Determine if we're in a fallback state (error or loading with no data)
  const isUnavailable = error || (isLoading && matches.length === 0);

  // Live alerts detection - only when data is available
  const { hasRecentGoal } = useLiveAlerts(isUnavailable ? [] : matches);

  /* -------------------- CLOCK -------------------- */

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* -------------------- STATUS RULES -------------------- */

  const allowedStatusTabs: StatusTab[] = useMemo(() => {
    if (dateMode === "yesterday") return ["all"];
    if (dateMode === "tomorrow") return ["all"];
    return ["all", "live", "upcoming", "finished"];
  }, [dateMode]);

  useEffect(() => {
    if (!allowedStatusTabs.includes(statusTab)) {
      setStatusTab("all");
    }
  }, [allowedStatusTabs, statusTab]);

  /* -------------------- STATS -------------------- */

  const liveCount = matches.filter((m) => m.status === "live" || m.status === "halftime").length;

  const leaguesCount = new Set(matches.map((m) => m.league)).size;

  /* -------------------- FILTERING -------------------- */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter((m) => {
      const okSearch =
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q);

      const okLeague = leagueFilter === "All Leagues" || m.league.toLowerCase().includes(leagueFilter.toLowerCase());

      return okSearch && okLeague;
    });
  }, [matches, search, leagueFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce(
      (acc, m) => {
        acc[m.league] ??= [];
        acc[m.league].push(m);
        return acc;
      },
      {} as Record<string, Match[]>,
    );
  }, [filtered]);

  const getDateLabel = (d: DateMode) => {
    const now = new Date();
    if (d === "yesterday") return format(subDays(now, 1), "MMM d");
    if (d === "tomorrow") return format(addDays(now, 1), "MMM d");
    return format(now, "MMM d");
  };

  /* -------------------- RENDER -------------------- */

  return (
    <DashboardLayout>
      <div className="section-gap max-w-full overflow-x-hidden">
        {/* HEADER - Compact on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Zap className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold">Live Scores</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Real-time updates</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="font-mono text-xs sm:text-sm px-2 py-1">
              {format(currentTime, "HH:mm:ss")}
            </Badge>
            <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline text-xs">Refresh</span>
            </Button>
          </div>
        </div>

        {/* STATS CARDS - Compact grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard title="Live Now" value={liveCount} icon={Play} variant="live" />
          <StatCard title="Total" value={matches.length} icon={BarChart3} variant="matches" />
          <StatCard title="Leagues" value={leaguesCount} icon={Trophy} variant="leagues" />
          
          {/* Favorites Quick Link */}
          <Card 
            onClick={() => navigate("/favorites")}
            className="stats-card bg-gradient-to-br from-pink-500/15 to-pink-600/5 border-pink-500/20 hover:border-pink-500/40 cursor-pointer hover:scale-[1.02]"
          >
            <div className="stats-card-icon bg-pink-500/15">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400" />
            </div>
            <div>
              <p className="stats-card-label">Favorites</p>
              <p className="text-xs sm:text-sm font-semibold text-pink-400">View →</p>
            </div>
          </Card>
        </div>

        {/* FILTERS - Horizontal scroll chips */}
        <div className="space-y-2 sm:space-y-3">
          {/* Leagues - chip scroll */}
          <div className="chip-scroll">
            {LEAGUES.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={leagueFilter === l ? "default" : "outline"}
                onClick={() => setLeagueFilter(l)}
                className="chip-btn"
              >
                {l}
                {l === "All Leagues" && <Badge className="ml-1.5 bg-white/10 text-[10px] px-1">{leaguesCount}</Badge>}
              </Button>
            ))}
          </div>
          
          {/* Date selector - compact */}
          <div className="flex gap-1.5 sm:gap-2">
            {(["yesterday", "today", "tomorrow"] as DateMode[]).map((d) => (
              <Button
                key={d}
                onClick={() => setDateMode(d)}
                size="sm"
                className={cn(
                  "flex-1 flex-col px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg min-w-0 h-auto",
                  dateMode === d 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card text-muted-foreground border border-border hover:bg-secondary",
                )}
              >
                <span className="capitalize text-xs font-medium">{d}</span>
                <span className="text-[10px] opacity-70">{getDateLabel(d)}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* STATUS TABS - Compact */}
        <div className="bg-secondary/50 border border-border rounded-lg p-0.5 sm:p-1 flex gap-0.5 sm:gap-1">
          {allowedStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all",
                statusTab === tab 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              {tab === "all" && <Trophy className="h-3.5 w-3.5" />}
              {tab === "live" && <Play className="h-3.5 w-3.5" />}
              {tab === "upcoming" && <Clock className="h-3.5 w-3.5" />}
              {tab === "finished" && <CheckCircle className="h-3.5 w-3.5" />}
              <span className="hidden xs:inline capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* SEARCH - Compact */}
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 sm:h-9 text-sm bg-card border-border focus:border-primary/50 rounded-lg"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* MATCHES or FALLBACK */}
        {isUnavailable ? (
          <LiveScoresFallback />
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-6 sm:p-8 text-center bg-card border-border">
            <p className="text-sm text-muted-foreground">No matches found</p>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {Object.entries(grouped).map(([league, games]) => (
              <Card key={league} className="overflow-hidden bg-card border-border">
                {/* League Header - Compact */}
                <div className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-secondary/30 border-b border-border flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-xs sm:text-sm truncate">{league}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5">
                    {games.length}
                  </Badge>
                </div>

                {/* Match Rows - Compact */}
                <div className="divide-y divide-border">
                  {games.map((m) => {
                    const isLive = m.status === "live" || m.status === "halftime";
                    const isFinished = m.status === "finished";
                    const isUpcoming = m.status === "upcoming";
                    const showGoalIndicator = hasRecentGoal(m.id);

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatch(m)}
                        className={cn(
                          "px-2 sm:px-3 py-2 sm:py-2.5 hover:bg-secondary/30 cursor-pointer transition-colors",
                          showGoalIndicator && "bg-success/10 border-l-2 border-success"
                        )}
                      >
                        {/* Grid layout for alignment */}
                        <div className="grid grid-cols-[32px_1fr_60px_1fr_80px] sm:grid-cols-[48px_1fr_80px_1fr_100px] items-center gap-1 sm:gap-2">
                          {/* Actions */}
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(m.id);
                              }}
                              className={cn(
                                "h-6 w-6 sm:h-7 sm:w-7 rounded flex items-center justify-center transition-all",
                                isFavorite(m.id) ? "bg-primary/20" : "bg-secondary hover:bg-secondary/80",
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-3 w-3 sm:h-3.5 sm:w-3.5",
                                  isFavorite(m.id) ? "text-primary fill-primary" : "text-muted-foreground",
                                )}
                              />
                            </button>
                            <MatchAlertButton
                              hasAlert={hasAlert(m.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMatchAlert(m.id);
                              }}
                            />
                          </div>

                          {/* Home Team - Right aligned */}
                          <div className="flex items-center gap-1 sm:gap-2 justify-end min-w-0">
                            <span className={cn(
                              "text-xs sm:text-sm font-medium truncate text-right",
                              showGoalIndicator && "text-success font-semibold"
                            )}>
                              {m.homeTeam}
                            </span>
                            {m.homeLogo && (
                              <img src={m.homeLogo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
                            )}
                          </div>

                          {/* Score - Centered */}
                          <div className="flex justify-center">
                            <div className={cn(
                              "px-2 py-1 rounded text-center min-w-[50px] sm:min-w-[65px]",
                              isLive && !showGoalIndicator && "bg-destructive/15 border border-destructive/30",
                              isLive && showGoalIndicator && "bg-success/15 border border-success/30",
                              isFinished && "bg-secondary border border-border",
                              isUpcoming && "bg-muted border border-border",
                            )}>
                              <span className={cn(
                                "font-bold text-xs sm:text-sm",
                                isLive && !showGoalIndicator && "text-destructive",
                                isLive && showGoalIndicator && "text-success",
                              )}>
                                {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                              </span>
                            </div>
                          </div>

                          {/* Away Team - Left aligned */}
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            {m.awayLogo && (
                              <img src={m.awayLogo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-xs sm:text-sm font-medium truncate",
                              showGoalIndicator && "text-success font-semibold"
                            )}>
                              {m.awayTeam}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex justify-end">
                            <StatusBadge match={m} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </DashboardLayout>
  );
}

/* -------------------- HELPERS -------------------- */

function StatCard({
  title,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  value: number;
  icon: any;
  variant: "live" | "matches" | "leagues";
}) {
  const variantStyles = {
    live: {
      gradient: "from-destructive/15 to-destructive/5",
      iconBg: "bg-destructive/15",
      iconColor: "text-destructive",
      border: "border-destructive/20",
      valueColor: "text-destructive",
    },
    matches: {
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15",
      iconColor: "text-success",
      border: "border-success/20",
      valueColor: "text-success",
    },
    leagues: {
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-accent/15",
      iconColor: "text-accent",
      border: "border-accent/20",
      valueColor: "text-accent",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "stats-card bg-gradient-to-br",
        styles.gradient,
        styles.border,
      )}
    >
      <div className={cn("stats-card-icon", styles.iconBg)}>
        <Icon className={cn("h-5 w-5 md:h-6 md:w-6", styles.iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="stats-card-label">{title}</p>
        <p className={cn("stats-card-value", styles.valueColor)}>{value}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    const minute = match.minute ?? 0;
    return (
      <div className="flex items-center gap-1">
        <Badge className="bg-destructive/15 text-destructive border border-destructive/30 font-bold text-xs px-2 py-1">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse mr-1.5" />
          {minute}'
        </Badge>
        <Badge className="hidden md:inline-flex bg-destructive/10 text-destructive border border-destructive/20 text-xs">
          LIVE
        </Badge>
      </div>
    );
  }
  if (match.status === "halftime") {
    return (
      <Badge className="bg-warning/15 text-warning border border-warning/30 font-bold text-xs px-2.5 py-1">
        HT
      </Badge>
    );
  }
  if (match.status === "finished") {
    return (
      <Badge className="bg-muted text-muted-foreground border border-border font-semibold text-xs px-2.5 py-1">
        FT
      </Badge>
    );
  }
  // Upcoming - show countdown
  return <KickoffCountdown startTime={match.startTime} />;
}
