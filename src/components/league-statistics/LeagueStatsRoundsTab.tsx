import { RotateCcw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLeagueRounds, useLeagueFixtures, RoundsResponse, FixturesResponse, FixtureData } from "@/hooks/useLeagueStats";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface LeagueStatsRoundsTabProps {
  leagueId: string;
  leagueName: string;
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
    const played = roundFixtures.filter(f => f.status.short === "FT" || f.status.short === "AET" || f.status.short === "PEN").length;
    const total = roundFixtures.length;
    return { played, total };
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
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs",
                        stats.played === stats.total && stats.total > 0 ? "text-green-400" : "text-muted-foreground"
                      )}>
                        {stats.played} / {stats.total} matches
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
                        <div
                          key={fixture.id}
                          className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {fixture.home.logo && (
                              <img src={fixture.home.logo} alt="" className="w-4 h-4 object-contain" />
                            )}
                            <span className="truncate max-w-[100px]">{fixture.home.name}</span>
                          </div>
                          <div className="px-3 text-center min-w-[60px]">
                            {fixture.status.short === "NS" ? (
                              <span className="text-xs text-muted-foreground">vs</span>
                            ) : (
                              <span className="font-bold">
                                {fixture.home.goals ?? 0} - {fixture.away.goals ?? 0}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="truncate max-w-[100px] text-right">{fixture.away.name}</span>
                            {fixture.away.logo && (
                              <img src={fixture.away.logo} alt="" className="w-4 h-4 object-contain" />
                            )}
                          </div>
                        </div>
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
