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
      <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        {/* HEADER - Clean desktop layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Zap className="text-primary h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Live Scores</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Real-time match updates</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="font-mono text-sm px-3 py-1.5">
              {format(currentTime, "HH:mm:ss")}
            </Badge>
            <Button size="sm" variant="outline" onClick={refetch} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* STATS CARDS - Uniform height and spacing */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Live Now" value={liveCount} icon={Play} variant="live" />
          <StatCard title="Total Matches" value={matches.length} icon={BarChart3} variant="matches" />
          <StatCard title="Leagues" value={leaguesCount} icon={Trophy} variant="leagues" />
          
          {/* Favorites Quick Link */}
          <Card 
            onClick={() => navigate("/favorites")}
            className="stats-card bg-gradient-to-br from-pink-500/15 to-pink-600/5 border-pink-500/20 hover:border-pink-500/40 cursor-pointer hover:scale-[1.02]"
          >
            <div className="stats-card-icon bg-pink-500/15">
              <Heart className="h-5 w-5 md:h-6 md:w-6 text-pink-400" />
            </div>
            <div>
              <p className="stats-card-label">My Favorites</p>
              <p className="text-sm md:text-base font-semibold text-pink-400">View All →</p>
            </div>
          </Card>
        </div>

        {/* FILTERS SECTION - Clean grid on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          {/* Left: Leagues */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {LEAGUES.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={leagueFilter === l ? "default" : "outline"}
                onClick={() => setLeagueFilter(l)}
                className="flex-shrink-0 text-sm whitespace-nowrap"
              >
                {l}
                {l === "All Leagues" && <Badge className="ml-2 bg-white/10 text-xs">{leaguesCount}</Badge>}
              </Button>
            ))}
          </div>
          
          {/* Right: Date selector */}
          <div className="flex gap-2">
            {(["yesterday", "today", "tomorrow"] as DateMode[]).map((d) => (
              <Button
                key={d}
                onClick={() => setDateMode(d)}
                size="sm"
                className={cn(
                  "flex-1 lg:flex-none flex-col px-4 py-2 rounded-lg min-w-[80px]",
                  dateMode === d 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card text-muted-foreground border border-border hover:bg-secondary",
                )}
              >
                <span className="capitalize text-sm font-medium">{d}</span>
                <span className="text-xs opacity-70">{getDateLabel(d)}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* STATUS TABS - Clean horizontal bar */}
        <div className="bg-secondary/50 border border-border rounded-lg p-1 flex gap-1">
          {allowedStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                statusTab === tab 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              {tab === "all" && <Trophy className="h-4 w-4" />}
              {tab === "live" && <Play className="h-4 w-4" />}
              {tab === "upcoming" && <Clock className="h-4 w-4" />}
              {tab === "finished" && <CheckCircle className="h-4 w-4" />}
              <span className="hidden xs:inline capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-card border-border focus:border-primary/50 rounded-lg"
            placeholder="Search teams, leagues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* MATCHES or FALLBACK */}
        {isUnavailable ? (
          <LiveScoresFallback />
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <p className="text-muted-foreground">No matches found for this selection</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([league, games]) => (
              <Card key={league} className="overflow-hidden bg-card border-border">
                {/* League Header */}
                <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm md:text-base">{league}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {games.length} matches
                  </Badge>
                </div>

                {/* Match Rows */}
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
                          "px-3 md:px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors",
                          showGoalIndicator && "bg-success/10 border-l-2 border-success"
                        )}
                      >
                        {/* Desktop: CSS Grid for perfect alignment */}
                        <div className="grid grid-cols-[40px_1fr_80px_1fr_100px] md:grid-cols-[60px_1fr_100px_1fr_120px] items-center gap-2">
                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(m.id);
                              }}
                              className={cn(
                                "h-7 w-7 md:h-8 md:w-8 rounded-md flex items-center justify-center transition-all",
                                isFavorite(m.id) ? "bg-primary/20 shadow-sm" : "bg-secondary hover:bg-secondary/80",
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-3.5 w-3.5 md:h-4 md:w-4",
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
                          <div className="flex items-center gap-2 justify-end min-w-0">
                            <span className={cn(
                              "text-sm md:text-base font-medium truncate text-right",
                              showGoalIndicator && "text-success font-semibold"
                            )}>
                              {m.homeTeam}
                            </span>
                            {m.homeLogo && (
                              <img src={m.homeLogo} alt="" className="h-5 w-5 md:h-6 md:w-6 object-contain flex-shrink-0" />
                            )}
                          </div>

                          {/* Score - Centered */}
                          <div className="flex justify-center">
                            <div className={cn(
                              "px-3 py-1.5 rounded-lg text-center min-w-[70px] md:min-w-[80px]",
                              isLive && !showGoalIndicator && "bg-destructive/15 border border-destructive/30",
                              isLive && showGoalIndicator && "bg-success/15 border border-success/30",
                              isFinished && "bg-secondary border border-border",
                              isUpcoming && "bg-muted border border-border",
                            )}>
                              <span className={cn(
                                "font-bold text-sm md:text-base",
                                isLive && !showGoalIndicator && "text-destructive",
                                isLive && showGoalIndicator && "text-success",
                              )}>
                                {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                              </span>
                            </div>
                          </div>

                          {/* Away Team - Left aligned */}
                          <div className="flex items-center gap-2 min-w-0">
                            {m.awayLogo && (
                              <img src={m.awayLogo} alt="" className="h-5 w-5 md:h-6 md:w-6 object-contain flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-sm md:text-base font-medium truncate",
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
