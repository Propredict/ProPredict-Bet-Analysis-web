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
      <Card className="bg-[#0E1627] border-white/10 p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-[#0E1627] border-white/10">
        <p className="text-muted-foreground">Failed to load fixtures. Please try again.</p>
      </Card>
    );
  }

  if (filteredMatches.length === 0) {
    return (
      <Card className="p-8 text-center bg-[#0E1627] border-white/10">
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
        className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
      >
        {/* Time/Status */}
        <div className="w-16 text-sm">
          {isUpcoming && <span className="text-muted-foreground">{m.startTime}</span>}
          {isLive && (
            <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
              {m.minute}'
            </Badge>
          )}
          {isFinished && <span className="text-green-400 text-xs">FT</span>}
        </div>

        {/* Teams */}
        <div className="flex-1 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {m.homeLogo && <img src={m.homeLogo} alt="" className="h-5 w-5 object-contain" />}
            <span className="text-sm">{m.homeTeam}</span>
          </div>

          <span className={cn(
            "px-3 py-1 rounded text-sm font-semibold min-w-[60px] text-center",
            isLive && "text-red-400 bg-red-500/10",
            isFinished && "text-white bg-white/10",
            isUpcoming && "text-muted-foreground"
          )}>
            {isUpcoming ? "vs" : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-sm">{m.awayTeam}</span>
            {m.awayLogo && <img src={m.awayLogo} alt="" className="h-5 w-5 object-contain" />}
          </div>
        </div>

        {/* Status Badge */}
        <div className="w-20 text-right">
          {isUpcoming && (
            <Badge variant="outline" className="text-xs">
              Upcoming
            </Badge>
          )}
          {isLive && (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs">
              LIVE
            </Badge>
          )}
          {isFinished && (
            <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
              FT
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
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
        <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <Play className="h-4 w-4" />
              Live Now ({liveMatches.length})
            </span>
          </div>
          {liveMatches.map(renderMatchRow)}
        </Card>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
          <div className="px-4 py-2 bg-white/5 border-b border-white/10">
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
        <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
          <div className="px-4 py-2 bg-white/5 border-b border-white/10">
            <span className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
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
