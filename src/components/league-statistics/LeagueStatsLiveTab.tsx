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
                    className="px-2 sm:px-4 py-2 sm:py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    {/* Responsive Flex Layout - matches Live Scores */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      {/* Minute/Status - Compact fixed width */}
                      <div className="flex-shrink-0 w-8 sm:w-12 text-center">
                        {isLive && (
                          <Badge className="bg-destructive/15 text-destructive border-0 text-[9px] sm:text-xs px-1 sm:px-1.5">
                            {m.minute ?? 0}'
                          </Badge>
                        )}
                        {isUpcoming && (
                          <span className="text-[9px] sm:text-xs text-muted-foreground">{m.startTime}</span>
                        )}
                        {isFinished && (
                          <span className="text-[9px] sm:text-xs text-muted-foreground">FT</span>
                        )}
                      </div>

                      {/* Teams & Score - Flexible */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                        {/* Home Team - Right aligned */}
                        <div className="flex items-center gap-1 justify-end flex-1 min-w-0">
                          <span className="text-[10px] sm:text-xs truncate text-right" title={m.homeTeam}>
                            {m.homeTeam}
                          </span>
                          {m.homeLogo && (
                            <img src={m.homeLogo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
                          )}
                        </div>

                        {/* Score - Centered fixed width */}
                        <div className={cn(
                          "flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded min-w-[40px] sm:min-w-[52px] text-center",
                          isLive && "bg-destructive/10 border border-destructive/30",
                          isFinished && "bg-primary/10 border border-primary/20",
                          isUpcoming && "bg-secondary border border-border"
                        )}>
                          <span className={cn(
                            "font-bold text-[10px] sm:text-xs",
                            isLive && "text-destructive"
                          )}>
                            {isUpcoming ? "vs" : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                          </span>
                        </div>

                        {/* Away Team - Left aligned */}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {m.awayLogo && (
                            <img src={m.awayLogo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
                          )}
                          <span className="text-[10px] sm:text-xs truncate" title={m.awayTeam}>
                            {m.awayTeam}
                          </span>
                        </div>
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
