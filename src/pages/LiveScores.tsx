import { useMemo, useState } from "react";
import { Zap, RefreshCw, Bell, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";

type StatusTab = "all" | "live" | "upcoming" | "finished";

export default function LiveScores() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");

  const { matches, isLoading, error, refetch } = useLiveScores(tab);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const q = search.toLowerCase();
      return (
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q)
      );
    });
  }, [matches, search]);

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

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="text-primary" />
              <h1 className="text-xl font-semibold">Live Scores</h1>
            </div>
            <p className="text-sm text-muted-foreground">Real-time match updates • Pull down to refresh</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{new Date().toLocaleTimeString()}</Badge>
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
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
            <p className="text-2xl font-bold text-red-500">{liveCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Matches</p>
            <p className="text-2xl font-bold">{matches.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Leagues</p>
            <p className="text-2xl font-bold">{Object.keys(grouped).length}</p>
          </Card>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Search teams, leagues, countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* TABS */}
        <div className="flex gap-2">
          {(["all", "live", "upcoming", "finished"] as StatusTab[]).map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {t}
            </Button>
          ))}
        </div>

        {/* CONTENT */}
        {isLoading && <Card className="p-10 text-center">Loading…</Card>}
        {error && <Card className="p-10 text-center text-red-500">{error}</Card>}

        {Object.entries(grouped).map(([league, games]) => (
          <Card key={league}>
            <div className="px-4 py-3 border-b flex justify-between">
              <span className="font-medium">{league}</span>
              <Badge>{games.length}</Badge>
            </div>

            <div className="divide-y">
              {games.map((m) => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-4">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                    <span className="text-right">{m.homeTeam}</span>
                    <span className="font-bold px-3">
                      {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                    </span>
                    <span>{m.awayTeam}</span>
                  </div>

                  <StatusBadge match={m} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === "live") {
    return <Badge className="bg-red-500 animate-pulse">LIVE {match.minute}'</Badge>;
  }
  if (match.status === "halftime") {
    return <Badge className="bg-yellow-500">HT</Badge>;
  }
  if (match.status === "finished") {
    return <Badge variant="secondary">FT</Badge>;
  }
  return <Badge variant="outline">{match.startTime}</Badge>;
}
