import {
  Zap,
  RefreshCw,
  Bell,
  BellRing,
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
import { GlobalAlertsModal } from "@/components/live-scores/GlobalAlertsModal";
import { MatchAlertButton } from "@/components/live-scores/MatchAlertButton";
import { KickoffCountdown } from "@/components/live-scores/KickoffCountdown";
import { LiveScoresFallback } from "@/components/live-scores/LiveScoresFallback";
import { useFavorites } from "@/hooks/useFavorites";
import { useGlobalAlertSettings } from "@/hooks/useGlobalAlertSettings";
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
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { matches, isLoading, error, refetch } = useLiveScores({
    dateMode,
    statusFilter: statusTab,
  });

  const { isFavorite, toggleFavorite } = useFavorites();
  const { settings: alertSettings, toggleSetting: toggleAlertSetting } = useGlobalAlertSettings();
  const { hasAlert, toggleMatchAlert } = useMatchAlertPreferences();

  // Determine if we're in a fallback state (error or loading with no data)
  const isUnavailable = error || (isLoading && matches.length === 0);

  // Live alerts detection - only when data is available
  useLiveAlerts(isUnavailable ? [] : matches);

  /* -------------------- CLOCK -------------------- */

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* -------------------- STATUS RULES -------------------- */

  const allowedStatusTabs: StatusTab[] = useMemo(() => {
    if (dateMode === "yesterday") return ["all", "finished"];
    if (dateMode === "tomorrow") return ["all", "upcoming"];
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
      <div className="space-y-6">
        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-[#0B1220]/95 backdrop-blur border-b border-white/5 px-4 py-4 -mx-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="text-primary" />
              <h1 className="text-xl font-bold">Live Scores</h1>
            </div>

            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="font-mono">
                {format(currentTime, "HH:mm")}
              </Badge>
              <Button size="icon" variant="outline" onClick={refetch}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                className={cn(
                  "transition-all duration-300",
                  alertSettings.enabled
                    ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                    : "bg-[#1a1f2e] hover:bg-[#252b3d] border border-white/10",
                )}
                onClick={() => setShowGlobalAlerts(true)}
              >
                {alertSettings.enabled ? (
                  <BellRing className="h-4 w-4 mr-2 animate-pulse" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Alerts
                {alertSettings.enabled && <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse" />}
              </Button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Live Now" value={liveCount} icon={Play} variant="live" />
          <StatCard title="Total Matches" value={matches.length} icon={BarChart3} variant="matches" />
          <StatCard title="Leagues" value={leaguesCount} icon={Trophy} variant="leagues" />
          
          {/* Favorites Quick Link */}
          <Card 
            onClick={() => navigate("/favorites")}
            className="p-4 flex items-center gap-4 bg-gradient-to-br from-pink-500/20 to-pink-600/5 border-pink-500/30 shadow-lg shadow-pink-500/10 cursor-pointer transition-all hover:scale-[1.02] hover:border-pink-500/50"
          >
            <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-pink-500/20">
              <Heart className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">My Favorites</p>
              <p className="text-sm font-semibold text-pink-400">View All →</p>
            </div>
          </Card>
        </div>

        {/* LEAGUES */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {LEAGUES.map((l) => (
            <Button
              key={l}
              size="sm"
              variant={leagueFilter === l ? "default" : "outline"}
              onClick={() => setLeagueFilter(l)}
            >
              {l}
              {l === "All Leagues" && <Badge className="ml-2 bg-white/10">{leaguesCount}</Badge>}
            </Button>
          ))}
        </div>

        {/* DATE */}
        <div className="flex gap-2">
          {(["yesterday", "today", "tomorrow"] as DateMode[]).map((d) => (
            <Button
              key={d}
              onClick={() => setDateMode(d)}
              className={cn(
                "flex-1 flex-col rounded-xl",
                dateMode === d ? "bg-primary text-primary-foreground" : "bg-[#0E1627] text-muted-foreground",
              )}
            >
              <span className="capitalize">{d}</span>
              <span className="text-xs opacity-70">{getDateLabel(d)}</span>
            </Button>
          ))}
        </div>

        {/* 🔥 STATUS BAR – ORANGE & CLEAR */}
        <div className="bg-[#1A1208] border border-orange-500/30 rounded-xl p-1 flex gap-1">
          {allowedStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition",
                statusTab === tab ? "bg-orange-500 text-black font-semibold" : "text-orange-300 hover:bg-orange-500/20",
              )}
            >
              {tab === "all" && <Trophy className="h-4 w-4" />}
              {tab === "live" && <Play className="h-4 w-4" />}
              {tab === "upcoming" && <Clock className="h-4 w-4" />}
              {tab === "finished" && <CheckCircle className="h-4 w-4" />}
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-orange-500/20 to-green-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center">
            <div className="absolute left-3 h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Search className="h-4 w-4 text-green-400" />
            </div>
            <Input
              className="pl-14 pr-4 py-6 bg-gradient-to-r from-[#0E1627] to-[#0E1627]/80 border-green-500/30 focus:border-green-500/50 rounded-xl text-base placeholder:text-muted-foreground/60"
              placeholder="Search teams, leagues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* MATCHES or FALLBACK */}
        {isUnavailable ? (
          <LiveScoresFallback />
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No matches found for this selection</p>
          </Card>
        ) : (
          Object.entries(grouped).map(([league, games]) => (
            <Card key={league}>
              <div className="px-4 py-2 border-b border-white/5 font-semibold">{league}</div>

            {games.map((m) => {
              const isLive = m.status === "live" || m.status === "halftime";
              const isFinished = m.status === "finished";
              const isUpcoming = m.status === "upcoming";

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(m.id);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        isFavorite(m.id) ? "bg-primary/20 shadow-lg shadow-primary/30" : "bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
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

                  {/* CENTERED SCORE */}
                  <div className="flex-1 grid grid-cols-[1fr_96px_1fr] items-center">
                    <span className="text-right pr-3 truncate">{m.homeTeam}</span>

                    <div className="flex justify-center">
                      <span
                        className={cn(
                          "w-[72px] text-center px-3 py-1 rounded-full text-sm font-semibold",
                          isLive && "text-red-500 bg-red-500/10",
                          isFinished && "text-white bg-white/10",
                          isUpcoming && "text-muted-foreground bg-white/5",
                        )}
                      >
                        {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                      </span>
                    </div>

                    <span className="text-left pl-3 truncate">{m.awayTeam}</span>
                  </div>

                  <StatusBadge match={m} />
                </div>
              );
            })}
          </Card>
          ))
        )}
      </div>

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      <GlobalAlertsModal
        isOpen={showGlobalAlerts}
        onClose={() => setShowGlobalAlerts(false)}
        settings={alertSettings}
        onToggle={toggleAlertSetting}
      />
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
      gradient: "from-red-500/20 to-red-600/5",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      border: "border-red-500/30",
      valueColor: "text-red-400",
      glow: "shadow-red-500/10",
    },
    matches: {
      gradient: "from-green-500/20 to-green-600/5",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-400",
      border: "border-green-500/30",
      valueColor: "text-green-400",
      glow: "shadow-green-500/10",
    },
    leagues: {
      gradient: "from-orange-500/20 to-orange-600/5",
      iconBg: "bg-orange-500/20",
      iconColor: "text-orange-400",
      border: "border-orange-500/30",
      valueColor: "text-orange-400",
      glow: "shadow-orange-500/10",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "p-4 flex items-center gap-4 bg-gradient-to-br border transition-all hover:scale-[1.02]",
        styles.gradient,
        styles.border,
        styles.glow && `shadow-lg ${styles.glow}`,
      )}
    >
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", styles.iconBg)}>
        <Icon className={cn("h-5 w-5", styles.iconColor)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className={cn("text-2xl font-bold", styles.valueColor)}>{value}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    const minute = match.minute ?? 0;
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-xs px-2">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5" />
          {minute}'
        </Badge>
        <Badge className="bg-red-500/10 text-red-500 border border-red-500/30 text-[10px]">LIVE</Badge>
      </div>
    );
  }
  if (match.status === "halftime") {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs px-2.5">
        ⏸ HT
      </Badge>
    );
  }
  if (match.status === "finished") {
    return (
      <Badge className="bg-muted/50 text-muted-foreground border border-border font-semibold text-xs px-2.5">
        FT
      </Badge>
    );
  }
  // Upcoming - show countdown
  return <KickoffCountdown startTime={match.startTime} />;
}
