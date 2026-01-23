import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { useMatchAlerts } from "@/hooks/useMatchAlerts";
import { format, subDays, addDays } from "date-fns";

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

export default function LiveScores() {
  const navigate = useNavigate();

  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertsMatch, setAlertsMatch] = useState<Match | null>(null);

  const { matches, isLoading, error, refetch } = useLiveScores({
    dateMode,
    statusFilter: statusTab,
  });

  const { isFavorite, isSaving, toggleFavorite } = useFavorites();
  const { hasAlert, refetch: refetchAlerts } = useMatchAlerts();

  /* ---------- CLOCK ---------- */
  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  /* ---------- STATUS TABS PER DATE ---------- */
  const allowedStatusTabs = useMemo<StatusTab[]>(() => {
    if (dateMode === "today") return ["all", "live", "upcoming", "finished"];
    if (dateMode === "yesterday") return ["all", "finished"];
    if (dateMode === "tomorrow") return ["all", "upcoming"];
    return ["all"];
  }, [dateMode]);

  useEffect(() => {
    if (!allowedStatusTabs.includes(statusTab)) {
      setStatusTab("all");
    }
  }, [allowedStatusTabs, statusTab]);

  /* ---------- STATS ---------- */
  const liveCount = useMemo(
    () => matches.filter((m) => m.status === "live" || m.status === "halftime").length,
    [matches],
  );

  const leaguesCount = useMemo(() => new Set(matches.map((m) => m.league)).size, [matches]);

  /* ---------- LIVE BADGE LOGIC ---------- */
  const showLiveForDate = (d: DateMode) => {
    if (d === "today") return true;
    if (d === "yesterday" && liveCount > 0) return true;
    return false;
  };

  /* ---------- FILTERING ---------- */
  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const q = search.toLowerCase();

      const okSearch =
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q) ||
        m.leagueCountry?.toLowerCase().includes(q);

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

  /* ---------- HELPERS ---------- */
  const getDateLabel = (d: DateMode) => {
    const now = new Date();
    if (d === "yesterday") return format(subDays(now, 1), "MMM d");
    if (d === "tomorrow") return format(addDays(now, 1), "MMM d");
    return format(now, "MMM d");
  };

  const handleRefresh = () => {
    refetch();
    refetchAlerts();
  };

  const handleFavorite = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      toggleFavorite(id, navigate);
    },
    [toggleFavorite, navigate],
  );

  /* ---------- RENDER ---------- */
  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-[#0B1220]/95 backdrop-blur border-b border-white/5 px-4 py-4 -mx-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="text-primary" />
                <h1 className="text-xl font-bold">Live Scores</h1>
              </div>
              <p className="text-sm text-muted-foreground">Real-time match updates • Pull down to refresh</p>
            </div>

            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="font-mono">
                {format(currentTime, "HH:mm")}
              </Badge>
              <Button variant="outline" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                onClick={() => {
                  const m = matches.find((m) => m.status === "live") || matches[0];
                  if (m) setAlertsMatch(m);
                }}
              >
                <Bell className="h-4 w-4 mr-1" />
                Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* STATUS TABS */}
        <div className="flex gap-2 overflow-x-auto">
          {allowedStatusTabs.map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={statusTab === tab ? "default" : "outline"}
              onClick={() => setStatusTab(tab)}
            >
              {tab === "all" && "All Matches"}
              {tab === "live" && "Live Now"}
              {tab === "upcoming" && "Upcoming"}
              {tab === "finished" && "Finished"}
            </Button>
          ))}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Live Now" value={liveCount} color="destructive" icon={Play} pulse />
          <StatCard title="Total Matches" value={matches.length} color="primary" icon={BarChart3} />
          <StatCard title="Leagues" value={leaguesCount} color="warning" icon={Trophy} />
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
            </Button>
          ))}
        </div>

        {/* DATE + LIVE BADGE */}
        <div className="flex gap-2">
          {(["yesterday", "today", "tomorrow"] as DateMode[]).map((d) => (
            <Button
              key={d}
              variant={dateMode === d ? "default" : "outline"}
              onClick={() => setDateMode(d)}
              className="flex-1 flex-col relative"
            >
              <span className="capitalize">{d}</span>
              <span className="text-xs opacity-70">{getDateLabel(d)}</span>

              {showLiveForDate(d) && liveCount > 0 && (
                <span className="mt-1 text-[10px] font-semibold text-red-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE {liveCount}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            className="pl-10"
            placeholder="Search teams, leagues, countries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* MATCHES */}
        {Object.entries(grouped).map(([league, games]) => (
          <Card key={league}>
            <div className="px-4 py-2 border-b border-white/5 flex justify-between">
              <span className="font-semibold">{league}</span>
              <Badge variant="secondary">{games.length}</Badge>
            </div>

            {games.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer"
              >
                <button onClick={(e) => handleFavorite(e, m.id)} disabled={isSaving(m.id)}>
                  <Star
                    className={cn("h-4 w-4", isFavorite(m.id) ? "text-primary fill-primary" : "text-muted-foreground")}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlertsMatch(m);
                  }}
                >
                  <Bell
                    className={cn("h-4 w-4", hasAlert(m.id) ? "text-primary fill-primary" : "text-muted-foreground")}
                  />
                </button>

                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center">
                  <span className="text-right">{m.homeTeam}</span>
                  <span className="font-bold px-3">
                    {m.status === "upcoming" ? "vs" : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                  </span>
                  <span>{m.awayTeam}</span>
                </div>

                <StatusBadge match={m} />
              </div>
            ))}
          </Card>
        ))}

        {!isLoading && !error && filtered.length === 0 && (
          <Card className="p-10 text-center opacity-70">No matches for selected filters</Card>
        )}

        {error && <Card className="p-6 text-center text-destructive">{error}</Card>}
      </div>

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      <MatchAlertsModal
        match={alertsMatch}
        onClose={() => {
          setAlertsMatch(null);
          refetchAlerts();
        }}
      />
    </DashboardLayout>
  );
}

/* ---------- HELPERS ---------- */

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  pulse,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Card className="p-4 flex justify-between items-center">
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold text-${color}`}>{value}</p>
      </div>
      <div className={cn("p-2 rounded-full", pulse && "animate-pulse")}>
        <Icon />
      </div>
    </Card>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return <Badge className="bg-destructive animate-pulse">LIVE {match.minute}'</Badge>;
  }
  if (match.status === "halftime") {
    return <Badge className="bg-warning">HT</Badge>;
  }
  if (match.status === "finished") {
    return <Badge variant="secondary">FT</Badge>;
  }
  return <Badge variant="outline">{match.startTime}</Badge>;
}
