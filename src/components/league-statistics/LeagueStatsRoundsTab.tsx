import { RotateCcw, Loader2, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeagueRounds, useLeagueFixtures, RoundsResponse, FixturesResponse, FixtureData } from "@/hooks/useLeagueStats";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LeagueStatsRoundsTabProps {
  leagueId: string;
  leagueName: string;
}

// Helper to determine match status
function getMatchState(statusShort: string) {
  const liveStatuses = ["1H", "2H", "ET", "P", "LIVE", "HT", "BT"];
  const finishedStatuses = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];
  
  if (liveStatuses.includes(statusShort)) return "live";
  if (finishedStatuses.includes(statusShort)) return "finished";
  return "upcoming";
}

export function LeagueStatsRoundsTab({ leagueId, leagueName }: LeagueStatsRoundsTabProps) {
  const { data: roundsData, isLoading: roundsLoading } = useLeagueRounds(leagueId);
  const { data: fixturesData, isLoading: fixturesLoading } = useLeagueFixtures(leagueId);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);

  const rounds = (roundsData as RoundsResponse)?.rounds || [];
  const fixtures = (fixturesData as FixturesResponse)?.fixtures || [];

  // Group fixtures by round
  const fixturesByRound = useMemo(() => {
    const grouped: Record<string, FixtureData[]> = {};
    fixtures.forEach((fixture) => {
      const round = fixture.round || "Unknown";
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(fixture);
    });
    return grouped;
  }, [fixtures]);

  // Get round stats
  const getRoundStats = (round: string) => {
    const roundFixtures = fixturesByRound[round] || [];
    const played = roundFixtures.filter(f => getMatchState(f.status.short) === "finished").length;
    const live = roundFixtures.filter(f => getMatchState(f.status.short) === "live").length;
    const total = roundFixtures.length;
    return { played, live, total };
  };

  const isLoading = roundsLoading || fixturesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <span className="font-semibold">{leagueName} Matchdays & Rounds</span>
          </div>
          <span className="text-xs text-muted-foreground">
            📊 Official data · Updated after round completion
          </span>
        </div>
      </Card>

      {/* Rounds List */}
      <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rounds.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            No rounds data available
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rounds.slice().reverse().map((round: string, index: number) => {
              const stats = getRoundStats(round);
              const isExpanded = expandedRound === round;
              const roundFixtures = fixturesByRound[round] || [];

              return (
                <div key={round}>
                  <button
                    onClick={() => setExpandedRound(isExpanded ? null : round)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {rounds.length - index}
                      </span>
                      <span className="text-sm font-medium">{round}</span>
                      {stats.live > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 border-0 text-xs animate-pulse">
                          <Play className="h-3 w-3 mr-1" />
                          {stats.live} Live
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs",
                        stats.played === stats.total && stats.total > 0 ? "text-green-400" : "text-muted-foreground"
                      )}>
                        {stats.played} / {stats.total} played
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded fixtures */}
                  {isExpanded && roundFixtures.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      {roundFixtures.map((fixture) => (
                        <RoundFixtureRow key={fixture.id} fixture={fixture} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// Individual fixture row component
function RoundFixtureRow({ fixture }: { fixture: FixtureData }) {
  const matchState = getMatchState(fixture.status.short);
  const isLive = matchState === "live";
  const isFinished = matchState === "finished";
  const isUpcoming = matchState === "upcoming";
  
  const matchDate = new Date(fixture.date);
  const dateLabel = format(matchDate, "MMM d");

  return (
    <div className={cn(
      "flex items-center py-3 border-b border-white/5 last:border-0",
      isLive && "bg-red-500/5"
    )}>
      {/* Date - Left */}
      <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-muted-foreground">
        <span className="text-xs">📅</span>
        <span className="text-xs">{dateLabel}</span>
      </div>

      {/* Match Content - Centered */}
      <div className="flex-1 flex items-center justify-center">
        {/* Home Team */}
        <div className="flex items-center justify-end flex-1 min-w-0">
          <span className={cn(
            "text-sm truncate",
            isFinished && fixture.home.goals !== null && fixture.away.goals !== null && 
            fixture.home.goals > fixture.away.goals && "text-green-400 font-medium"
          )} title={fixture.home.name}>
            {fixture.home.name}
          </span>
        </div>

        {/* Score */}
        <div className="mx-4 flex-shrink-0 min-w-[50px] text-center">
          {isUpcoming ? (
            <span className="text-muted-foreground text-sm">vs</span>
          ) : (
            <span className={cn(
              "font-semibold",
              isLive && "text-red-400"
            )}>
              {fixture.home.goals ?? 0}
              <span className="text-muted-foreground mx-1">-</span>
              {fixture.away.goals ?? 0}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center flex-1 min-w-0">
          <span className={cn(
            "text-sm truncate",
            isFinished && fixture.home.goals !== null && fixture.away.goals !== null && 
            fixture.away.goals > fixture.home.goals && "text-green-400 font-medium"
          )} title={fixture.away.name}>
            {fixture.away.name}
          </span>
        </div>
      </div>

      {/* Status Badge - Right */}
      <div className="w-20 flex-shrink-0 flex justify-end">
        {isUpcoming && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-white/20">
            Upcoming
          </Badge>
        )}
        {isLive && (
          <Badge className="bg-green-500 text-white border-0 text-xs">
            Live
          </Badge>
        )}
        {isFinished && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-white/20">
            FT
          </Badge>
        )}
      </div>
    </div>
  );
}
