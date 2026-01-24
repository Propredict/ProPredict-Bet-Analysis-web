import { useState, useMemo } from "react";
import { Calendar, Play, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";

interface LeagueStatsFixturesTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsFixturesTab({ leagueId, leagueName }: LeagueStatsFixturesTabProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Fetch today's matches from real data
  const { matches, isLoading, error } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // Filter matches by selected league
  const filteredMatches = useMemo(() => {
    if (!leagueName) return [];
    return matches.filter((m) =>
      m.league.toLowerCase().includes(leagueName.toLowerCase())
    );
  }, [matches, leagueName]);

  // Group by status
  const upcomingMatches = filteredMatches.filter((m) => m.status === "upcoming");
  const liveMatches = filteredMatches.filter((m) => m.status === "live" || m.status === "halftime");
  const finishedMatches = filteredMatches.filter((m) => m.status === "finished");

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-secondary" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <p className="text-muted-foreground">Failed to load fixtures. Please try again.</p>
      </Card>
    );
  }

  if (filteredMatches.length === 0) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">No fixtures available for {leagueName} today.</p>
      </Card>
    );
  }

  const renderMatchRow = (m: Match) => {
    const isLive = m.status === "live" || m.status === "halftime";
    const isFinished = m.status === "finished";
    const isUpcoming = m.status === "upcoming";

    return (
      <div
        key={m.id}
        onClick={() => setSelectedMatch(m)}
        className="px-4 py-4 hover:bg-secondary/30 transition-colors cursor-pointer border-b border-border last:border-0"
      >
        {/* Desktop Grid Layout */}
        <div className="grid grid-cols-[50px_1fr_80px_1fr_80px] md:grid-cols-[60px_1fr_100px_1fr_100px] items-center gap-2">
          {/* Time/Status - Left */}
          <div className="flex-shrink-0">
            {isUpcoming && <span className="text-sm text-muted-foreground">{m.startTime}</span>}
            {isLive && (
              <Badge className="bg-destructive/15 text-destructive border-0 text-xs animate-pulse">
                {m.minute}'
              </Badge>
            )}
            {isFinished && <span className="text-success text-xs font-medium">FT</span>}
          </div>

          {/* Home Team - Right aligned */}
          <div className="flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm truncate text-right" title={m.homeTeam}>
              {m.homeTeam}
            </span>
            {m.homeLogo && (
              <img src={m.homeLogo} alt="" className="h-6 w-6 object-contain flex-shrink-0" />
            )}
          </div>

          {/* Score - Centered */}
          <div className="flex justify-center">
            <div className={cn(
              "px-4 py-1.5 rounded-lg min-w-[70px] text-center",
              isLive && "bg-destructive/10 border border-destructive/30",
              isFinished && "bg-primary/10 border border-primary/20",
              isUpcoming && "bg-secondary border border-border"
            )}>
              <span className={cn(
                "font-bold text-base tracking-wider",
                isLive && "text-destructive"
              )}>
                {isUpcoming ? (
                  <span className="text-muted-foreground text-sm">vs</span>
                ) : (
                  <>
                    {m.homeScore ?? 0} <span className="text-muted-foreground">-</span> {m.awayScore ?? 0}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Away Team - Left aligned */}
          <div className="flex items-center gap-2 min-w-0">
            {m.awayLogo && (
              <img src={m.awayLogo} alt="" className="h-6 w-6 object-contain flex-shrink-0" />
            )}
            <span className="text-sm truncate" title={m.awayTeam}>
              {m.awayTeam}
            </span>
          </div>

          {/* Status Badge - Right */}
          <div className="text-right hidden sm:block">
            {isUpcoming && (
              <Badge variant="outline" className="text-xs">
                Upcoming
              </Badge>
            )}
            {isLive && (
              <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs">
                LIVE
              </Badge>
            )}
            {isFinished && (
              <Badge variant="outline" className="text-success border-success/30 text-xs">
                Finished
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold">{leagueName} Fixtures & Results</span>
          <Badge variant="outline" className="ml-auto">
            {filteredMatches.length} matches today
          </Badge>
        </div>
      </Card>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <span className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Play className="h-4 w-4" />
              Live Now ({liveMatches.length})
            </span>
          </div>
          {liveMatches.map(renderMatchRow)}
        </Card>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="px-4 py-2 bg-secondary/50 border-b border-border">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Upcoming ({upcomingMatches.length})
            </span>
          </div>
          {upcomingMatches.map(renderMatchRow)}
        </Card>
      )}

      {/* Finished Matches */}
      {finishedMatches.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="px-4 py-2 bg-secondary/50 border-b border-border">
            <span className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Finished ({finishedMatches.length})
            </span>
          </div>
          {finishedMatches.map(renderMatchRow)}
        </Card>
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal 
        match={selectedMatch} 
        onClose={() => setSelectedMatch(null)} 
      />
    </div>
  );
}
