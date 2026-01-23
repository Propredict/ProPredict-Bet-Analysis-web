import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Zap, RefreshCw, Bell, Search, Loader2, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLiveScores, type Match } from "@/hooks/useLiveScores";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

export default function LiveScores() {
  const { matches, loading, error, refetch } = useLiveScores();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());

  // clock tick (seconds)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const liveMatches = matches.filter((m) => m.status === "live" || m.status === "halftime");

  const leaguesCount = new Set(matches.map((m) => m.league)).size;

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q) ||
          m.leagueCountry.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matches, statusFilter, search]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Match[]>>((acc, m) => {
      if (!acc[m.league]) acc[m.league] = [];
      acc[m.league].push(m);
      return acc;
    }, {});
  }, [filtered]);

  const renderStatusBadge = (m: Match) => {
    if (m.status === "live" && m.startedAt) {
      const diff = Math.floor((Date.now() - m.startedAt) / 1000);
      const min = Math.floor(diff / 60);
      const sec = diff % 60;

      return (
        <Badge className="bg-red-500 text-white animate-pulse">
          LIVE {min}:{sec.toString().padStart(2, "0")}
        </Badge>
      );
    }

    if (m.status === "halftime") {
      return <Badge className="bg-yellow-400 text-black">HT</Badge>;
    }

    if (m.status === "finished") {
      return <Badge className="bg-muted text-muted-foreground">FT</Badge>;
    }

    return (
      <Badge variant="outline" className="text-muted-foreground">
        {m.startTime}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="text-primary" />
              <h1 className="text-xl font-semibold">Live Scores</h1>
            </div>
            <p className="text-sm text-muted-foreground">Real-time match updates • Pull down to refresh</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button className="bg-green-500 hover:bg-green-600">
              <Bell className="h-4 w-4 mr-1" /> Alerts
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Live Now</p>
            <p className="text-2xl font-bold text-red-500">{liveMatches.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Matches</p>
            <p className="text-2xl font-bold">{matches.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Leagues</p>
            <p className="text-2xl font-bold">{leaguesCount}</p>
          </Card>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Search teams, leagues, countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATUS FILTER */}
        <div className="flex gap-2">
          {(["all", "live", "upcoming", "finished"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </Card>
        ) : error ? (
          <Card className="p-12 text-center text-red-500">{error}</Card>
        ) : (
          Object.entries(grouped).map(([league, items]) => (
            <Card key={league} className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-medium">{league}</span>
                <Badge>{items.length}</Badge>
              </div>

              <div className="divide-y">
                {items.map((m) => (
                  <div
                    key={m.id}
                    className={cn("px-4 py-3 flex items-center gap-4", m.status === "live" && "bg-red-500/5")}
                  >
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                      <span className="text-right">{m.homeTeam}</span>
                      <span className="font-bold px-3">
                        {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                      </span>
                      <span>{m.awayTeam}</span>
                    </div>
                    {renderStatusBadge(m)}
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
