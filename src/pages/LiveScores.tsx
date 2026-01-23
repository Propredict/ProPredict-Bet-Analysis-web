import { Zap, RefreshCw, Bell, Star, Search, Play, Trophy, BarChart3, Clock, CheckCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertsMatch, setAlertsMatch] = useState<Match | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { matches, isLoading, error, refetch } = useLiveScores({
    dateMode,
    statusFilter: statusTab,
  });

  const { isFavorite, toggleFavorite } = useFavorites();
  const { refetch: refetchAlerts } = useMatchAlerts();

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
      <div className="space-y-5">
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
                onClick={() => {
                  const m = matches.find((m) => m.status === "live");
                  if (m) setAlertsMatch(m);
                }}
              >
                <Bell className="h-4 w-4 mr-1" />
                Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Live Now" value={liveCount} icon={Play} />
          <StatCard title="Total Matches" value={matches.length} icon={BarChart3} />
          <StatCard title="Leagues" value={leaguesCount} icon={Trophy} />
        </div>

        {/* LEAGUES BAR */}
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

        {/* STATUS BAR */}
        <div className="bg-[#0E1627] rounded-xl p-1 flex gap-1">
          {allowedStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm",
                statusTab === tab ? "bg-[#18223A] text-white" : "text-muted-foreground hover:text-white",
              )}
            >
              {tab === "all" && <Trophy className="h-4 w-4" />}
              {tab === "live" && <Play className="h-4 w-4" />}
              {tab === "upcoming" && <Clock className="h-4 w-4" />}
              {tab === "finished" && <CheckCircle className="h-4 w-4" />}
              {tab}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-[#0E1627]"
            placeholder="Search teams, leagues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* MATCHES */}
        {Object.entries(grouped).map(([league, games]) => (
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m.id);
                    }}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        isFavorite(m.id) ? "text-primary fill-primary" : "text-muted-foreground",
                      )}
                    />
                  </button>

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
        ))}

        {error && <Card className="p-6 text-center text-destructive">{error}</Card>}
      </div>

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      <MatchAlertsModal match={alertsMatch} onClose={() => setAlertsMatch(null)} />
    </DashboardLayout>
  );
}

/* -------------------- HELPERS -------------------- */

function StatCard({ title, value, icon: Icon }: any) {
  return (
    <Card className="p-4 flex justify-between items-center">
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <Icon />
    </Card>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return <Badge className="bg-red-500/10 text-red-500 border border-red-500/30">LIVE</Badge>;
  }
  if (match.status === "halftime") {
    return <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">HT</Badge>;
  }
  if (match.status === "finished") {
    return <Badge className="bg-white/5 text-muted-foreground border border-white/10">FT</Badge>;
  }
  return <Badge variant="outline">{match.startTime}</Badge>;
}
