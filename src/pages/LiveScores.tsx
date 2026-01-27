import { Zap, RefreshCw, Star, Search, Play, Trophy, BarChart3, Clock, CheckCircle, Heart } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const LEAGUES = ["All Leagues", "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1", "Champions League", "Europa League"];
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
  const {
    matches,
    isLoading,
    error,
    refetch
  } = useLiveScores({
    dateMode,
    statusFilter: statusTab
  });
  const {
    isFavorite,
    toggleFavorite
  } = useFavorites();
  const {
    hasAlert,
    toggleMatchAlert
  } = useMatchAlertPreferences();

  // Determine if we're in a fallback state (error or loading with no data)
  const isUnavailable = error || isLoading && matches.length === 0;

  // Live alerts detection - only when data is available
  const {
    hasRecentGoal
  } = useLiveAlerts(isUnavailable ? [] : matches);

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

  const liveCount = matches.filter(m => m.status === "live" || m.status === "halftime").length;
  const leaguesCount = new Set(matches.map(m => m.league)).size;

  /* -------------------- FILTERING -------------------- */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter(m => {
      const okSearch = m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.league.toLowerCase().includes(q);
      const okLeague = leagueFilter === "All Leagues" || m.league.toLowerCase().includes(leagueFilter.toLowerCase());
      return okSearch && okLeague;
    });
  }, [matches, search, leagueFilter]);
  const grouped = useMemo(() => {
    return filtered.reduce((acc, m) => {
      acc[m.league] ??= [];
      acc[m.league].push(m);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filtered]);
  const getDateLabel = (d: DateMode) => {
    const now = new Date();
    if (d === "yesterday") return format(subDays(now, 1), "MMM d");
    if (d === "tomorrow") return format(addDays(now, 1), "MMM d");
    return format(now, "MMM d");
  };

  /* -------------------- RENDER -------------------- */

  return <div className="section-gap max-w-full overflow-x-hidden">
        {/* HEADER - COMPACT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-1.5 pb-1 border-b border-border">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Zap className="text-primary h-3 w-3 sm:w-[20px] sm:h-[20px]" />
            </div>
            <div>
              <h1 className="text-xs font-bold sm:text-base">All Leagues Live Scores</h1>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Real-time</p>
            </div>
          </div>

          <div className="flex gap-1 items-center">
            <Badge variant="outline" className="font-mono text-[9px] sm:text-[10px] px-1 py-0.5">
              {format(currentTime, "HH:mm:ss")}
            </Badge>
            <Button size="sm" variant="outline" onClick={refetch} className="gap-0.5 h-5 sm:h-6 px-1 sm:px-1.5">
              <RefreshCw className={cn("h-2.5 w-2.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline text-[9px]">Refresh</span>
            </Button>
          </div>
        </div>

        {/* STATS CARDS - COMPACT grid */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          <StatCard title="Live" value={liveCount} icon={Play} variant="live" />
          <StatCard title="Total" value={matches.length} icon={BarChart3} variant="matches" />
          <StatCard title="Leagues" value={leaguesCount} icon={Trophy} variant="leagues" />
          
          {/* Favorites Quick Link */}
          <Card onClick={() => navigate("/favorites")} className="flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-pink-500/15 to-pink-600/5 border-pink-500/20 hover:border-pink-500/40 cursor-pointer">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-pink-500/15 flex items-center justify-center flex-shrink-0">
              <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-pink-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Favorites</p>
              <p className="text-[9px] sm:text-[10px] font-semibold text-pink-400">View →</p>
            </div>
          </Card>
        </div>

        {/* FILTERS - Enhanced visibility */}
        <div className="space-y-2 sm:space-y-3">
          {/* Leagues - chip scroll */}
          <div className="chip-scroll">
            {LEAGUES.map(l => <Button key={l} size="sm" variant={leagueFilter === l ? "default" : "outline"} onClick={() => setLeagueFilter(l)} className="chip-btn">
                {l}
                {l === "All Leagues" && <Badge className="ml-1 bg-white/10 text-[9px] px-1">{leaguesCount}</Badge>}
              </Button>)}
          </div>
          
          {/* Date selector - Enhanced with prominent borders */}
          <div className="relative">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/40 via-accent/20 to-primary/40 rounded-xl opacity-80" />
            <div className="relative bg-card/90 backdrop-blur-sm rounded-xl p-1.5 border border-border/50 shadow-lg">
              <div className="flex gap-1.5 sm:gap-2">
                {(["yesterday", "today", "tomorrow"] as DateMode[]).map(d => (
                  <Button 
                    key={d} 
                    onClick={() => setDateMode(d)} 
                    size="sm" 
                    className={cn(
                      "flex-1 flex-col px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg min-w-0 h-auto transition-all duration-200",
                      dateMode === d 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-0" 
                        : "bg-secondary/60 text-muted-foreground border border-border/60 hover:bg-secondary hover:text-foreground hover:border-primary/30"
                    )}
                  >
                    <span className="capitalize text-[11px] sm:text-xs font-semibold">{d}</span>
                    <span className={cn(
                      "text-[10px] sm:text-[11px]",
                      dateMode === d ? "opacity-80" : "opacity-60"
                    )}>{getDateLabel(d)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STATUS TABS - Individual bordered tabs */}
        <div className="flex gap-2">
          {allowedStatusTabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => setStatusTab(tab)} 
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-medium transition-all duration-200",
                statusTab === tab 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-2 border-primary" 
                  : "bg-card/50 text-muted-foreground border border-border hover:text-foreground hover:border-primary/50 hover:bg-card"
              )}
            >
              {tab === "all" && <Trophy className="h-3.5 w-3.5" />}
              {tab === "live" && <Play className="h-3.5 w-3.5" />}
              {tab === "upcoming" && <Clock className="h-3.5 w-3.5" />}
              {tab === "finished" && <CheckCircle className="h-3.5 w-3.5" />}
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* SEARCH - Enhanced visibility with gradient border */}
        <div className="relative max-w-sm">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/50 via-accent/30 to-primary/50 rounded-lg opacity-75" />
          <div className="relative flex items-center bg-card rounded-lg">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              className="pl-8 h-8 sm:h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg placeholder:text-muted-foreground/70" 
              placeholder="Search teams…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {/* MATCHES or FALLBACK */}
        {isUnavailable ? <LiveScoresFallback /> : Object.keys(grouped).length === 0 ? <Card className="p-4 sm:p-6 text-center bg-card border-border">
            <p className="text-xs text-muted-foreground">No matches found</p>
          </Card> : <div className="space-y-1 sm:space-y-1.5">
            {Object.entries(grouped).map(([league, games]) => <Card key={league} className="overflow-hidden bg-card border-border">
                {/* League Header - Compact */}
                <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-secondary/30 border-b border-border flex items-center gap-1">
                  <Trophy className="h-2.5 w-2.5 text-primary" />
                  <span className="font-semibold text-[9px] sm:text-[10px] truncate">{league}</span>
                  <Badge variant="outline" className="ml-auto text-[8px] px-0.5">
                    {games.length}
                  </Badge>
                </div>

                {/* Match Rows - Compact */}
                <div className="divide-y divide-border">
                  {games.map(m => {
            const isLive = m.status === "live" || m.status === "halftime";
            const isFinished = m.status === "finished";
            const isUpcoming = m.status === "upcoming";
            const showGoalIndicator = hasRecentGoal(m.id);
            return <div key={m.id} onClick={() => setSelectedMatch(m)} className={cn("px-1.5 sm:px-2 py-1.5 sm:py-2 hover:bg-secondary/30 cursor-pointer transition-colors", showGoalIndicator && "bg-success/10 border-l-2 border-success")}>
                        {/* Grid layout for alignment */}
                        <div className="grid grid-cols-[28px_1fr_52px_1fr_72px] sm:grid-cols-[40px_1fr_64px_1fr_88px] items-center gap-0.5 sm:gap-1.5">
                          {/* Actions */}
                          <div className="flex items-center gap-0.5">
                            <button onClick={e => {
                    e.stopPropagation();
                    toggleFavorite(m.id);
                  }} className={cn("h-5 w-5 sm:h-6 sm:w-6 rounded flex items-center justify-center transition-all", isFavorite(m.id) ? "bg-primary/20" : "bg-secondary hover:bg-secondary/80")}>
                              <Star className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", isFavorite(m.id) ? "text-primary fill-primary" : "text-muted-foreground")} />
                            </button>
                            <MatchAlertButton hasAlert={hasAlert(m.id)} onClick={e => {
                    e.stopPropagation();
                    toggleMatchAlert(m.id);
                  }} />
                          </div>

                          {/* Home Team - Right aligned */}
                          <div className="flex items-center gap-0.5 sm:gap-1 justify-end min-w-0">
                            <span className={cn("text-[10px] sm:text-xs font-medium truncate text-right", showGoalIndicator && "text-success font-semibold")}>
                              {m.homeTeam}
                            </span>
                            {m.homeLogo && <img src={m.homeLogo} alt="" className="h-3 w-3 sm:h-4 sm:w-4 object-contain flex-shrink-0" />}
                          </div>

                          {/* Score - Centered */}
                          <div className="flex justify-center">
                            <div className={cn("px-1.5 py-0.5 rounded text-center min-w-[40px] sm:min-w-[52px]", isLive && !showGoalIndicator && "bg-destructive/15 border border-destructive/30", isLive && showGoalIndicator && "bg-success/15 border border-success/30", isFinished && "bg-secondary border border-border", isUpcoming && "bg-muted border border-border")}>
                              <span className={cn("font-bold text-[10px] sm:text-xs", isLive && !showGoalIndicator && "text-destructive", isLive && showGoalIndicator && "text-success")}>
                                {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                              </span>
                            </div>
                          </div>

                          {/* Away Team - Left aligned */}
                          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                            {m.awayLogo && <img src={m.awayLogo} alt="" className="h-3 w-3 sm:h-4 sm:w-4 object-contain flex-shrink-0" />}
                            <span className={cn("text-[10px] sm:text-xs font-medium truncate", showGoalIndicator && "text-success font-semibold")}>
                              {m.awayTeam}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex justify-end">
                            <StatusBadge match={m} />
                          </div>
                        </div>
                      </div>;
          })}
                </div>
              </Card>)}
          </div>}

        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>;
}

/* -------------------- HELPERS -------------------- */

function StatCard({
  title,
  value,
  icon: Icon,
  variant
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
      valueColor: "text-destructive"
    },
    matches: {
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15",
      iconColor: "text-success",
      border: "border-success/20",
      valueColor: "text-success"
    },
    leagues: {
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-accent/15",
      iconColor: "text-accent",
      border: "border-accent/20",
      valueColor: "text-accent"
    }
  };
  const styles = variantStyles[variant];
  return <Card className={cn("flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br", styles.gradient, styles.border)}>
      <div className={cn("h-5 w-5 sm:h-6 sm:w-6 rounded flex items-center justify-center flex-shrink-0", styles.iconBg)}>
        <Icon className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", styles.iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase truncate">{title}</p>
        <p className={cn("text-[10px] sm:text-xs font-bold leading-none", styles.valueColor)}>{value}</p>
      </div>
    </Card>;
}
function StatusBadge({
  match
}: {
  match: Match;
}) {
  if (match.status === "live") {
    const minute = match.minute ?? 0;
    return <div className="flex items-center gap-0.5">
        <Badge className="bg-destructive/15 text-destructive border border-destructive/30 font-bold text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse mr-0.5 sm:mr-1" />
          {minute}'
        </Badge>
        <Badge className="hidden md:inline-flex bg-destructive/10 text-destructive border border-destructive/20 text-[10px]">
          LIVE
        </Badge>
      </div>;
  }
  if (match.status === "halftime") {
    return <Badge className="bg-warning/15 text-warning border border-warning/30 font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5">
        HT
      </Badge>;
  }
  if (match.status === "finished") {
    return <Badge className="bg-muted text-muted-foreground border border-border font-semibold text-[9px] sm:text-[10px] px-1.5 py-0.5">
        FT
      </Badge>;
  }
  // Upcoming - show countdown
  return <KickoffCountdown startTime={match.startTime} />;
}