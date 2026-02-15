import { Helmet } from "react-helmet-async";
import { Zap, RefreshCw, Star, Search, Play, Trophy, BarChart3, Clock, CheckCircle, Heart, ChevronDown, ChevronRight, List, LayoutGrid, Volume2 } from "lucide-react";
import { useMemo, useState, useEffect, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MatchAlertButton } from "@/components/live-scores/MatchAlertButton";
import { KickoffCountdown } from "@/components/live-scores/KickoffCountdown";
import { LiveScoresFallback } from "@/components/live-scores/LiveScoresFallback";
import { AndroidNativeAdSlot } from "@/components/live-scores/AndroidNativeAdSlot";
import { useFavorites } from "@/hooks/useFavorites";
import { useMatchAlertPreferences } from "@/hooks/useMatchAlertPreferences";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { useGlobalAlertSettings } from "@/hooks/useGlobalAlertSettings";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { format, subDays, addDays } from "date-fns";
import AdSlot from "@/components/ads/AdSlot";

/* -------------------- CONSTANTS -------------------- */

const LEAGUES = ["All Leagues", "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1", "Champions League", "Europa League"];
type StatusTab = "all" | "live" | "upcoming" | "finished";
type DateMode = "yesterday" | "today" | "tomorrow";

/* -------------------- PAGE -------------------- */

export default function LiveScores() {
  console.log("🔥 LiveScores mounted");

  // Android only: notify native layer that Live Scores is visible
  // so it can prepare inline native ads between match rows
  useEffect(() => {
    if (getIsAndroidApp() && (window as any).Android?.onLiveScoresView) {
      (window as any).Android.onLiveScoresView();
    }
  }, []);
  
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<"simple" | "structured">("structured");
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
    favorites,
    isFavorite,
    toggleFavorite,
  } = useFavorites();
  const {
    hasAlert,
    toggleMatchAlert,
    alertedMatchIds
  } = useMatchAlertPreferences();

  // Determine if we're in a fallback state (error or loading with no data)
  const isUnavailable = error || isLoading && matches.length === 0;

  // Live alerts detection - pass favorites + per-match bell alerts
  const {
    hasRecentGoal
  } = useLiveAlerts(isUnavailable ? [] : matches, favorites, alertedMatchIds);

  // Global alert settings for sound indicator
  const { settings: globalAlertSettings } = useGlobalAlertSettings();

  // Check if sound is active for a specific match (3 tiers)
  const isSoundActive = useCallback((matchId: string) => {
    if (!globalAlertSettings.enabled) return false;
    if (globalAlertSettings.notifyGoals) return true; // All matches
    if (favorites.has(matchId)) return true; // Starred
    if (alertedMatchIds.has(matchId)) return true; // Bell
    return false;
  }, [globalAlertSettings, favorites, alertedMatchIds]);

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
  // Simple grouping by league only
  const grouped = useMemo(() => {
    return filtered.reduce((acc, m) => {
      acc[m.league] ??= [];
      acc[m.league].push(m);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filtered]);

  // Structured grouping: Country → League → Matches
  const structuredGrouped = useMemo(() => {
    const result: Record<string, Record<string, Match[]>> = {};
    filtered.forEach(m => {
      const country = m.leagueCountry || "Other";
      result[country] ??= {};
      result[country][m.league] ??= [];
      result[country][m.league].push(m);
    });
    // Sort countries alphabetically, but put "World" and "Other" at the end
    const sortedResult: Record<string, Record<string, Match[]>> = {};
    const sortedCountries = Object.keys(result).sort((a, b) => {
      if (a === "World" || a === "Other") return 1;
      if (b === "World" || b === "Other") return -1;
      return a.localeCompare(b);
    });
    sortedCountries.forEach(country => {
      sortedResult[country] = result[country];
    });
    return sortedResult;
  }, [filtered]);

  const countriesCount = Object.keys(structuredGrouped).length;
  const getDateLabel = (d: DateMode) => {
    const now = new Date();
    if (d === "yesterday") return format(subDays(now, 1), "MMM d");
    if (d === "tomorrow") return format(addDays(now, 1), "MMM d");
    return format(now, "MMM d");
  };

  /* -------------------- RENDER -------------------- */

  return (
    <>
      <Helmet>
        <title>Live Scores – AI Sports Predictions | ProPredict</title>
        <meta
          name="description"
          content="Real-time live scores from all major football leagues. Track matches, goals, and results. AI-powered sports analysis platform."
        />
      </Helmet>
      <div className="section-gap max-w-full overflow-x-hidden">
        {/* HEADER - COMPACT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Zap className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold sm:text-base text-foreground">All Leagues Live Scores</h1>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Real-time updates</p>
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

        {/* STATUS TABS - Individual bordered tabs with hover glow */}
        <div className="flex gap-2">
          {allowedStatusTabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => setStatusTab(tab)} 
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-medium transition-all duration-300",
                statusTab === tab 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-2 border-primary" 
                  : "bg-card/50 text-muted-foreground border border-border hover:text-foreground hover:border-primary/50 hover:bg-card hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
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

        {/* SEARCH + VIEW TOGGLE */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <div className="absolute -inset-[2px] bg-gradient-to-r from-white/60 via-primary/40 to-white/60 rounded-xl blur-[2px]" />
            <div className="absolute -inset-[1px] bg-gradient-to-r from-white/40 via-primary/30 to-white/40 rounded-xl" />
            <div className="relative flex items-center bg-card/90 rounded-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <Input 
                className="pl-9 h-9 sm:h-10 text-sm bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl placeholder:text-white/50 text-white" 
                placeholder="Search teams…" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("simple")}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all",
                viewMode === "simple" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3 w-3" />
              <span className="hidden sm:inline">Simple</span>
            </button>
            <button
              onClick={() => setViewMode("structured")}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all",
                viewMode === "structured" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3 w-3" />
              <span className="hidden sm:inline">Grouped</span>
            </button>
          </div>
        </div>

        {/* MATCHES or FALLBACK */}
        {isUnavailable ? (
          <LiveScoresFallback />
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-4 sm:p-6 text-center bg-card border-border">
            <p className="text-xs text-muted-foreground">No matches found</p>
          </Card>
        ) : viewMode === "simple" ? (
          /* ==================== SIMPLE VIEW ==================== */
          <div className="space-y-1 sm:space-y-1.5">
            {(() => {
              let matchCounter = 0;
              return Object.entries(grouped).map(([league, games]) => {
                const elements: React.ReactNode[] = [];
                // Check if we should insert an ad before this league group
                if (matchCounter >= 5 && matchCounter < 5 + games.length + 1) {
                  // Insert ad once after 5th match
                }
                const startCount = matchCounter;
                matchCounter += games.length;
                
                elements.push(
                  <Card key={league} className="overflow-hidden bg-card border-border">
                    <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-primary/20 flex items-center gap-1">
                      <Trophy className="h-2.5 w-2.5 text-primary" />
                      <span className="font-semibold text-[9px] sm:text-[10px] text-foreground truncate">{league}</span>
                      <Badge variant="outline" className="ml-auto text-[8px] px-0.5 border-primary/30 text-primary">
                        {games.length}
                      </Badge>
                    </div>
                    <div className="divide-y divide-border">
                      {games.map((m, idx) => (
                        <Fragment key={m.id}>
                          <MatchRow 
                            match={m} 
                            onSelect={setSelectedMatch}
                            isFavorite={isFavorite(m.id)}
                            toggleFavorite={() => toggleFavorite(m.id)}
                            hasAlert={hasAlert(m.id)}
                            toggleMatchAlert={() => toggleMatchAlert(m.id)}
                            hasRecentGoal={hasRecentGoal(m.id)}
                            soundActive={isSoundActive(m.id)}
                          />
                          {/* Android only: native ad slot after every 4th match */}
                          {(idx + 1) % 4 === 0 && idx < games.length - 1 && (
                            <AndroidNativeAdSlot slotIndex={idx + 1} />
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </Card>
                );

                // Insert web ad after the league group that crosses the 5th match threshold
                if (startCount < 5 && matchCounter >= 5) {
                  elements.push(<AdSlot key={`ad-${league}`} />);
                }

                return elements;
              });
            })()}
          </div>
        ) : (
          /* ==================== STRUCTURED VIEW (Country → League) ==================== */
          <div className="space-y-2">
            {Object.entries(structuredGrouped).map(([country, leagues]) => {
              const countryMatchCount = Object.values(leagues).flat().length;
              const countryLeagueCount = Object.keys(leagues).length;
              
              return (
                <CountrySection
                  key={country}
                  country={country}
                  leagues={leagues}
                  matchCount={countryMatchCount}
                  leagueCount={countryLeagueCount}
                  onSelectMatch={setSelectedMatch}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                  hasAlert={hasAlert}
                  toggleMatchAlert={toggleMatchAlert}
                  hasRecentGoal={hasRecentGoal}
                  isSoundActive={isSoundActive}
                />
              );
            })}
          </div>
        )}

        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>
    </>
  );
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

/* -------------------- MATCH ROW -------------------- */

function MatchRow({
  match: m,
  onSelect,
  isFavorite: isFav,
  toggleFavorite,
  hasAlert,
  toggleMatchAlert,
  hasRecentGoal: showGoalIndicator,
  soundActive
}: {
  match: Match;
  onSelect: (m: Match) => void;
  isFavorite: boolean;
  toggleFavorite: () => void;
  hasAlert: boolean;
  toggleMatchAlert: () => void;
  hasRecentGoal: boolean;
  soundActive?: boolean;
}) {
  const isLive = m.status === "live" || m.status === "halftime";
  const isFinished = m.status === "finished";
  const isUpcoming = m.status === "upcoming";

  return (
    <div 
      onClick={() => onSelect(m)} 
      className={cn(
        "px-1.5 sm:px-2 py-1.5 sm:py-2 hover:bg-secondary/30 cursor-pointer transition-colors",
        showGoalIndicator && "bg-success/10 border-l-2 border-success"
      )}
    >
      <div className="grid grid-cols-[28px_1fr_52px_1fr_72px] sm:grid-cols-[40px_1fr_64px_1fr_88px] items-center gap-0.5 sm:gap-1.5">
        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button 
            onClick={e => { e.stopPropagation(); toggleFavorite(); }} 
            className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 rounded flex items-center justify-center transition-all", 
              isFav ? "bg-primary/20" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Star className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", isFav ? "text-primary fill-primary" : "text-muted-foreground")} />
          </button>
          <MatchAlertButton 
            hasAlert={hasAlert} 
            onClick={e => { e.stopPropagation(); toggleMatchAlert(); }} 
          />
        </div>

        {/* Home Team */}
        <div className="flex items-center gap-0.5 sm:gap-1 justify-end min-w-0">
          <span className={cn("text-[10px] sm:text-xs font-medium truncate text-right", showGoalIndicator && "text-success font-semibold")}>
            {m.homeTeam}
          </span>
          {m.homeLogo && <img src={m.homeLogo} alt="" className="h-3 w-3 sm:h-4 sm:w-4 object-contain flex-shrink-0" />}
        </div>

        {/* Score */}
        <div className="flex justify-center">
          <div className={cn(
            "px-1.5 py-0.5 rounded text-center min-w-[40px] sm:min-w-[52px]",
            isLive && !showGoalIndicator && "bg-destructive/15 border border-destructive/30",
            isLive && showGoalIndicator && "bg-success/15 border border-success/30",
            isFinished && "bg-secondary border border-border",
            isUpcoming && "bg-muted border border-border"
          )}>
            <span className={cn(
              "font-bold text-[10px] sm:text-xs",
              isLive && !showGoalIndicator && "text-destructive",
              isLive && showGoalIndicator && "text-success"
            )}>
              {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
            </span>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          {m.awayLogo && <img src={m.awayLogo} alt="" className="h-3 w-3 sm:h-4 sm:w-4 object-contain flex-shrink-0" />}
          <span className={cn("text-[10px] sm:text-xs font-medium truncate", showGoalIndicator && "text-success font-semibold")}>
            {m.awayTeam}
          </span>
        </div>

        {/* Status + Sound indicator */}
        <div className="flex items-center justify-end gap-1">
          {soundActive && (
            <Volume2 className="h-2.5 w-2.5 text-primary/60" />
          )}
          <StatusBadge match={m} />
        </div>
      </div>
    </div>
  );
}

/* -------------------- COUNTRY SECTION -------------------- */

const COUNTRY_FLAGS: Record<string, string> = {
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Spain": "🇪🇸",
  "Germany": "🇩🇪",
  "Italy": "🇮🇹",
  "France": "🇫🇷",
  "Portugal": "🇵🇹",
  "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪",
  "Turkey": "🇹🇷",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Brazil": "🇧🇷",
  "Argentina": "🇦🇷",
  "USA": "🇺🇸",
  "Mexico": "🇲🇽",
  "Saudi-Arabia": "🇸🇦",
  "Japan": "🇯🇵",
  "Australia": "🇦🇺",
  "World": "🌍",
  "Europe": "🇪🇺",
};

function CountrySection({
  country,
  leagues,
  matchCount,
  leagueCount,
  onSelectMatch,
  isFavorite,
  toggleFavorite,
  hasAlert,
  toggleMatchAlert,
  hasRecentGoal,
  isSoundActive
}: {
  country: string;
  leagues: Record<string, Match[]>;
  matchCount: number;
  leagueCount: number;
  onSelectMatch: (m: Match) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  hasAlert: (id: string) => boolean;
  toggleMatchAlert: (id: string) => void;
  hasRecentGoal: (id: string) => boolean;
  isSoundActive: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const flag = COUNTRY_FLAGS[country] || "🏳️";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden bg-card border-border">
        {/* Country Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-gradient-to-r from-primary/25 via-primary/15 to-transparent border-b border-primary/30 flex items-center gap-2 hover:from-primary/30 hover:via-primary/20 transition-colors">
            <span className="text-base sm:text-lg">{flag}</span>
            <span className="font-bold text-xs sm:text-sm text-foreground">{country}</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 bg-primary/10 border-primary/30 text-primary">
                {leagueCount} league{leagueCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 bg-primary/15 text-primary border-primary/40">
                {matchCount} match{matchCount !== 1 ? "es" : ""}
              </Badge>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="divide-y divide-border/50">
            {Object.entries(leagues).map(([league, games]) => (
              <LeagueSection
                key={league}
                league={league}
                leagueLogo={games[0]?.leagueLogo}
                matches={games}
                onSelectMatch={onSelectMatch}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
                hasAlert={hasAlert}
                toggleMatchAlert={toggleMatchAlert}
                hasRecentGoal={hasRecentGoal}
                isSoundActive={isSoundActive}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* -------------------- LEAGUE SECTION -------------------- */

function LeagueSection({
  league,
  leagueLogo,
  matches,
  onSelectMatch,
  isFavorite,
  toggleFavorite,
  hasAlert,
  toggleMatchAlert,
  hasRecentGoal,
  isSoundActive
}: {
  league: string;
  leagueLogo: string | null;
  matches: Match[];
  onSelectMatch: (m: Match) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  hasAlert: (id: string) => boolean;
  toggleMatchAlert: (id: string) => void;
  hasRecentGoal: (id: string) => boolean;
  isSoundActive: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* League Header */}
      <CollapsibleTrigger asChild>
        <button className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-primary/20 flex items-center gap-1.5 hover:from-primary/25 hover:via-primary/15 transition-colors">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-primary" />
          ) : (
            <ChevronRight className="h-3 w-3 text-primary" />
          )}
          {leagueLogo ? (
            <img src={leagueLogo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain" />
          ) : (
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          )}
          <span className="font-semibold text-[10px] sm:text-xs text-foreground truncate">{league}</span>
          <Badge variant="outline" className="ml-auto text-[8px] px-1 border-primary/30 text-primary bg-primary/10">
            {matches.length}
          </Badge>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="divide-y divide-border">
          {matches.map((m, idx) => (
            <Fragment key={m.id}>
              <MatchRow
                match={m}
                onSelect={onSelectMatch}
                isFavorite={isFavorite(m.id)}
                toggleFavorite={() => toggleFavorite(m.id)}
                hasAlert={hasAlert(m.id)}
                toggleMatchAlert={() => toggleMatchAlert(m.id)}
                hasRecentGoal={hasRecentGoal(m.id)}
                soundActive={isSoundActive(m.id)}
              />
              {/* Android only: native ad slot after every 4th match */}
              {(idx + 1) % 4 === 0 && idx < matches.length - 1 && (
                <AndroidNativeAdSlot slotIndex={idx + 1} />
              )}
            </Fragment>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}