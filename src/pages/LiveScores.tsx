import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Zap, RefreshCw, Clock, Trophy, Star, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useLiveScores, type LiveMatch } from "@/hooks/useLiveScores";

type StatusFilter = "all" | "live" | "finished";

export default function LiveScores() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, isSaving, toggleFavorite } = useFavorites();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { matches, isLoading, error, refetch } = useLiveScores();

  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
    toast({
      title: "Scores Updated",
      description: "Live scores refreshed",
    });
  }, [refetch, toast]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter === "live" && m.status !== "LIVE" && m.status !== "HT") return false;

      if (statusFilter === "finished" && m.status !== "FT") return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.name.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [matches, statusFilter, searchQuery]);

  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce(
      (acc, match) => {
        const leagueName = match.league.name;
        if (!acc[leagueName]) acc[leagueName] = [];
        acc[leagueName].push(match);
        return acc;
      },
      {} as Record<string, LiveMatch[]>,
    );
  }, [filteredMatches]);

  const getStatusBadge = (match: LiveMatch) => {
    if (match.status === "LIVE") {
      return <Badge className="bg-destructive text-destructive-foreground">LIVE {match.elapsed}'</Badge>;
    }
    if (match.status === "HT") {
      return <Badge className="bg-yellow-500/20 text-yellow-500">HT</Badge>;
    }
    if (match.status === "FT") {
      return <Badge variant="secondary">FT</Badge>;
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Live Scores</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1 inline" />
              {lastUpdated.toLocaleTimeString()}
            </Badge>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
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

        {/* Status Filter */}
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
            <p className="mb-4">{error}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </Card>
        ) : (
          Object.entries(groupedMatches).map(([league, items]) => (
            <Card key={league}>
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-medium">{league}</span>
                </div>
                <Badge>{items.length}</Badge>
              </div>

              <div className="divide-y">
                {items.map((match) => (
                  <div key={match.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted">
                    <button onClick={() => toggleFavorite(String(match.id), navigate)} disabled={isSaving(String(match.id))}>
                      <Star
                        className={cn(
                          "h-4 w-4",
                          isFavorite(String(match.id)) ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                    </button>

                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                      <span className="text-right">{match.homeTeam}</span>
                      <span className="font-bold px-3">
                        {match.homeGoals} : {match.awayGoals}
                      </span>
                      <span>{match.awayTeam}</span>
                    </div>

                    {getStatusBadge(match)}
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
