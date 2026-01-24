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
  const kickoffTime = format(matchDate, "HH:mm");

  return (
    <div className={cn(
      "flex items-center px-3 py-3 rounded-lg text-sm",
      isLive ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"
    )}>
      {/* Status / Time - Left */}
      <div className="w-16 flex-shrink-0">
        {isUpcoming && (
          <span className="text-xs text-muted-foreground">{kickoffTime}</span>
        )}
        {isLive && (
          <Badge className="bg-red-500/20 text-red-400 border-0 text-xs animate-pulse">
            {fixture.status.short === "HT" ? "HT" : `${fixture.status.elapsed}'`}
          </Badge>
        )}
        {isFinished && (
          <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
            FT
          </Badge>
        )}
      </div>

      {/* Match Content - Centered */}
      <div className="flex-1 flex items-center justify-center">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className="text-sm truncate" title={fixture.home.name}>
            {fixture.home.name}
          </span>
          {fixture.home.logo && (
            <img src={fixture.home.logo} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
          )}
        </div>

        {/* Score - Prominently centered */}
        <div className="mx-3 flex-shrink-0">
          <div className={cn(
            "px-3 py-1 rounded-lg min-w-[60px] text-center",
            isLive && "bg-red-500/20 border border-red-500/30",
            isFinished && "bg-primary/10 border border-primary/20",
            isUpcoming && "bg-white/5 border border-white/10"
          )}>
            {isUpcoming ? (
              <span className="text-muted-foreground text-xs">vs</span>
            ) : (
              <span className={cn(
                "font-bold",
                isLive && "text-red-400"
              )}>
                {fixture.home.goals ?? 0} - {fixture.away.goals ?? 0}
              </span>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {fixture.away.logo && (
            <img src={fixture.away.logo} alt="" className="h-5 w-5 object-contain flex-shrink-0" />
          )}
          <span className="text-sm truncate" title={fixture.away.name}>
            {fixture.away.name}
          </span>
        </div>
      </div>

      {/* Status Badge - Right (hidden on mobile) */}
      <div className="w-20 flex-shrink-0 text-right hidden sm:block">
        {isLive && (
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs">
            LIVE
          </Badge>
        )}
      </div>
    </div>
  );
}
