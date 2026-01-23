import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Zap, RefreshCw, Bell, BellRing, Clock, Trophy, Star, Search, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { MatchAlertsModal } from "@/components/live-scores/MatchAlertsModal";
import { useMatchAlerts } from "@/hooks/useMatchAlerts";
import { useFavorites } from "@/hooks/useFavorites";
import { useLiveScores, type Match } from "@/hooks/useLiveScores";

type StatusFilter = "all" | "live" | "finished";

const leagues = ["All Leagues"];

export default function LiveScores() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [alertMatch, setAlertMatch] = useState<Match | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { toast } = useToast();
  const { hasAlert, refetch: refetchAlerts } = useMatchAlerts();
  const { isFavorite, isSaving, toggleFavorite } = useFavorites();

  const { matches, isLoading, error, refetch } = useLiveScores();

  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
    setShowSuccess(true);

    toast({
      title: "Scores Updated",
      description: "Live scores refreshed",
    });

    setTimeout(() => setShowSuccess(false), 2000);
  }, [refetch, toast]);

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

  const getStatusBadge = (match: Match) => {
    if (match.status === "live") {
      return <Badge className="bg-destructive text-destructive-foreground">LIVE {match.minute}'</Badge>;
    }
    if (match.status === "halftime") {
      return <Badge className="bg-yellow-500/20 text-yellow-500">HT</Badge>;
    }
    if (match.status === "finished") {
      return <Badge variant="secondary">FT</Badge>;
    }
    return <Badge variant="outline">{match.startTime}</Badge>;
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
            <Badge variant="outline">{showSuccess ? "Updated!" : lastUpdated.toLocaleTimeString()}</Badge>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
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
            <p>{error}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </Card>
        ) : (
          Object.entries(groupedMatches).map(([league, items]) => (
            <Card key={league}>
              <div className="px-4 py-3 border-b flex justify-between">
                <span className="font-medium">{league}</span>
                <Badge>{items.length}</Badge>
              </div>

              <div className="divide-y">
                {items.map((match) => (
                  <div
                    key={match.id}
                    className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(match.id, navigate);
                      }}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          isFavorite(match.id) ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                    </button>

                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr]">
                      <span className="text-right">{match.homeTeam}</span>
                      <span className="font-bold px-3">
                        {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
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

        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
        <MatchAlertsModal
          match={alertMatch}
          onClose={() => {
            setAlertMatch(null);
            refetchAlerts();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
