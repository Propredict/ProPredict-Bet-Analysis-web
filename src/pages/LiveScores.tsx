import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Zap, RefreshCw, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { useFavorites } from "@/hooks/useFavorites";

type Filter = "all" | "live" | "upcoming" | "finished";

export default function LiveScores() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { matches, isLoading, error, refetch } = useLiveScores(filter);
  const { isFavorite, toggleFavorite } = useFavorites();

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matches, search]);

  const grouped = useMemo(() => {
    return filtered.reduce(
      (acc, m) => {
        if (!acc[m.league]) acc[m.league] = [];
        acc[m.league].push(m);
        return acc;
      },
      {} as Record<string, Match[]>,
    );
  }, [filtered]);

  const statusBadge = (m: Match) => {
    if (m.status === "live") return <Badge className="bg-destructive">LIVE {m.minute}'</Badge>;
    if (m.status === "halftime") return <Badge className="bg-yellow-500">HT</Badge>;
    if (m.status === "finished") return <Badge variant="secondary">FT</Badge>;
    return <Badge variant="outline">{m.startTime}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Zap className="text-primary" />
            <h1 className="text-xl font-semibold">Live Scores</h1>
            <Badge variant="outline">Today · Jan 23</Badge>
          </div>

          <Button size="icon" variant="outline" onClick={refetch}>
            <RefreshCw className={cn(isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Search */}
        <Input placeholder="Search teams or leagues…" value={search} onChange={(e) => setSearch(e.target.value)} />

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "live", "upcoming", "finished"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="p-10 text-center">
            <Loader2 className="mx-auto animate-spin" />
          </Card>
        ) : error ? (
          <Card className="p-10 text-center text-destructive">{error}</Card>
        ) : (
          Object.entries(grouped).map(([league, items]) => (
            <Card key={league}>
              <div className="px-4 py-3 border-b flex justify-between">
                <span className="font-medium">{league}</span>
                <Badge>{items.length}</Badge>
              </div>

              <div className="divide-y">
                {items.map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted">
                    <button onClick={() => toggleFavorite(m.id)}>
                      <Star
                        className={cn(
                          "h-4 w-4",
                          isFavorite(m.id) ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                    </button>

                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                      <span className="text-right">{m.homeTeam}</span>
                      <span className="px-3 font-bold">
                        {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                      </span>
                      <span>{m.awayTeam}</span>
                    </div>

                    {statusBadge(m)}
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
