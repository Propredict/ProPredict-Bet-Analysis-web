import { useState } from "react";
import { Play, Clock, CheckCircle, Star, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";

type StatusFilter = "all" | "live" | "finished" | "scheduled";

interface LeagueStatsLiveTabProps {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  isAllLeagues: boolean;
  leagueName?: string;
}

export function LeagueStatsLiveTab({ 
  matches, 
  isLoading, 
  error, 
  isAllLeagues,
  leagueName 
}: LeagueStatsLiveTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Filter matches by status
  const filteredMatches = matches.filter((m) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "live") return m.status === "live" || m.status === "halftime";
    if (statusFilter === "finished") return m.status === "finished";
    if (statusFilter === "scheduled") return m.status === "upcoming";
    return true;
  });

  // Count stats
  const liveCount = matches.filter((m) => m.status === "live" || m.status === "halftime").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-[#0E1627]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-[#0E1627] border-white/10">
        <p className="text-muted-foreground">Failed to load matches. Please try again.</p>
      </Card>
    );
  }

  // Group by league
  const grouped = filteredMatches.reduce((acc, m) => {
    acc[m.league] ??= [];
    acc[m.league].push(m);
    return acc;
  }, {} as Record<string, Match[]>);

  const title = isAllLeagues ? "All Leagues Live Scores" : `${leagueName} Live Scores`;

  return (
    <div className="space-y-4">
      {/* Header with title and live count */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold">{title}</span>
            {liveCount > 0 && (
              <Badge className="bg-destructive/15 text-destructive border border-destructive/30">
                {liveCount} Live
              </Badge>
            )}
          </div>
          {/* Real-time indicator */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success">Real-time</span>
          </div>
        </div>
      </Card>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 border border-border">
        {(["all", "live", "finished", "scheduled"] as StatusFilter[]).map((filter) => (
          <Button
            key={filter}
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(filter)}
            className={cn(
              "flex-1 capitalize",
              statusFilter === filter 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {filter === "live" && <Play className="h-3 w-3 mr-1" />}
            {filter === "finished" && <CheckCircle className="h-3 w-3 mr-1" />}
            {filter === "scheduled" && <Clock className="h-3 w-3 mr-1" />}
            {filter}
          </Button>
        ))}
      </div>

      {/* Matches List */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <p className="text-muted-foreground">
            {isAllLeagues 
              ? "No matches available at the moment." 
              : "No matches available for this league today."}
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([league, games]) => (
          <Card key={league} className="bg-card border-border overflow-hidden">
            {/* League Header with Standings Link */}
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{league}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Standings ▼
              </span>
            </div>

            {/* Matches */}
            <div className="divide-y divide-border">
              {games.map((m) => {
                const isLive = m.status === "live" || m.status === "halftime";
                const isFinished = m.status === "finished";
                const isUpcoming = m.status === "upcoming";

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className="px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    {/* Desktop Grid Layout */}
                    <div className="grid grid-cols-[50px_1fr_80px_1fr_60px] md:grid-cols-[60px_1fr_100px_1fr_80px] items-center gap-2">
                      {/* Minute indicator for live */}
                      <div className="text-center">
                        {isLive && (
                          <Badge className="bg-destructive/15 text-destructive border-0 text-xs px-1.5">
                            {m.minute ?? 0}'
                          </Badge>
                        )}
                      </div>

                      {/* Home Team */}
                      <div className="flex items-center gap-2 justify-end min-w-0">
                        {m.homeLogo && (
                          <img src={m.homeLogo} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
                        )}
                        <span className="text-sm truncate text-right">{m.homeTeam}</span>
                      </div>

                      {/* Score */}
                      <div className="flex items-center justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded text-sm font-semibold",
                          isLive && "text-destructive",
                          isFinished && "text-foreground",
                          isUpcoming && "text-muted-foreground"
                        )}>
                          {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-2 min-w-0">
                        {m.awayLogo && (
                          <img src={m.awayLogo} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{m.awayTeam}</span>
                      </div>

                      {/* Half-time scores (muted) */}
                      <div className="text-right text-muted-foreground text-xs">
                        {isFinished && "(0)"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal 
        match={selectedMatch} 
        onClose={() => setSelectedMatch(null)} 
      />
    </div>
  );
}
