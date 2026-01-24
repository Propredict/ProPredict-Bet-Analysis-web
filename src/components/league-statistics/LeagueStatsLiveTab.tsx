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
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold">{title}</span>
            {liveCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/40">
                {liveCount} Live
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 bg-[#0E1627] rounded-xl p-1 border border-white/10">
        {(["all", "live", "finished", "scheduled"] as StatusFilter[]).map((filter) => (
          <Button
            key={filter}
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(filter)}
            className={cn(
              "flex-1 capitalize",
              statusFilter === filter 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
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
        <Card className="p-8 text-center bg-[#0E1627] border-white/10">
          <p className="text-muted-foreground">
            {isAllLeagues 
              ? "No matches available at the moment." 
              : "No matches available for this league today."}
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([league, games]) => (
          <Card key={league} className="bg-[#0E1627] border-white/10 overflow-hidden">
            {/* League Header with Standings Link */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{league}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Standings ▼
              </span>
            </div>

            {/* Matches */}
            <div className="divide-y divide-white/5">
              {games.map((m) => {
                const isLive = m.status === "live" || m.status === "halftime";
                const isFinished = m.status === "finished";
                const isUpcoming = m.status === "upcoming";

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Minute indicator for live */}
                    <div className="w-10 text-center">
                      {isLive && (
                        <Badge className="bg-red-500/20 text-red-400 border-0 text-xs px-1.5">
                          {m.minute ?? 0}'
                        </Badge>
                      )}
                    </div>

                    {/* Teams and Score */}
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="flex items-center gap-2 justify-end">
                        {m.homeLogo && (
                          <img src={m.homeLogo} alt="" className="h-5 w-5 object-contain" />
                        )}
                        <span className="text-sm truncate">{m.homeTeam}</span>
                      </div>

                      <div className="flex items-center gap-1 min-w-[60px] justify-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-sm font-semibold",
                          isLive && "text-red-400",
                          isFinished && "text-white",
                          isUpcoming && "text-muted-foreground"
                        )}>
                          {isUpcoming ? m.startTime : (m.homeScore ?? 0)}
                        </span>
                        {!isUpcoming && (
                          <>
                            <span className="text-muted-foreground text-xs">-</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-sm font-semibold",
                              isLive && "text-red-400",
                              isFinished && "text-white"
                            )}>
                              {m.awayScore ?? 0}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {m.awayLogo && (
                          <img src={m.awayLogo} alt="" className="h-5 w-5 object-contain" />
                        )}
                        <span className="text-sm truncate">{m.awayTeam}</span>
                      </div>
                    </div>

                    {/* Half-time scores (muted) */}
                    <div className="w-16 text-right text-muted-foreground text-xs">
                      {isFinished && "(0)"}
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
