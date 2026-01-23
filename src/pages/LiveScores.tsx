import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Zap, RefreshCw, Search, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLiveScores, type Match } from "@/hooks/useLiveScores";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate } from "react-router-dom";

type StatusFilter = "all" | "live" | "finished";

export default function LiveScores() {
  const navigate = useNavigate();
  const { matches, isLoading, error, refetch } = useLiveScores();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter === "live" && m.status !== "live" && m.status !== "halftime") return false;
      if (statusFilter === "finished" && m.status !== "finished") return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matches, statusFilter, searchQuery]);

  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce(
      (acc, match) => {
        if (!acc[match.league]) acc[match.league] = [];
        acc[match.league].push(match);
        return acc;
      },
      {} as Record<string, Match[]>,
    );
  }, [filteredMatches]);

  const getStatusBadge = (m: Match) => {
    if (m.status === "live") return <Badge className="bg-destructive">LIVE {m.minute}'</Badge>;
    if (m.status === "halftime") return <Badge className="bg-yellow-500/20 text-yellow-500">HT</Badge>;
    if (m.status === "finished") return <Badge variant="secondary">FT</Badge>;
    return <Badge variant="outline">{m.startTime ?? "—"}</Badge>;
  };

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Live Scores</h1>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams or leagues"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "live", "finished"] as StatusFilter[]).map((s) => (
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

        {/* Content */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </Card>
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={handleRefresh}>
              Retry
            </Button>
          </Card>
        ) : (
          Object.entries(groupedMatches).map(([league, items]) => (
            <Card key={league}>
              <div className="px-4 py-3 border-b flex justify-between">
                <span className="font-medium">{league}</span>
                <Badge>{items.length}</Badge>
              </div>

              <div className="divide-y">
                {items.map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted">
                    <button onClick={() => toggleFavorite(m.id, navigate)}>
                      <Star
                        className={cn(
                          "h-4 w-4",
                          isFavorite(m.id) ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                    </button>

                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                      <span className="text-right">{m.homeTeam}</span>
                      <span className="font-bold px-3">
                        {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                      </span>
                      <span>{m.awayTeam}</span>
                    </div>

                    {getStatusBadge(m)}
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
