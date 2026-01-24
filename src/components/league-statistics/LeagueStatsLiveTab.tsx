import { Play, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";
import { Skeleton } from "@/components/ui/skeleton";

interface LeagueStatsLiveTabProps {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  isAllLeagues: boolean;
}

export function LeagueStatsLiveTab({ matches, isLoading, error, isAllLeagues }: LeagueStatsLiveTabProps) {
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

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center bg-[#0E1627] border-white/10">
        <p className="text-muted-foreground">
          {isAllLeagues 
            ? "No matches available at the moment." 
            : "No matches available for this league today."}
        </p>
      </Card>
    );
  }

  // Group by league
  const grouped = matches.reduce((acc, m) => {
    acc[m.league] ??= [];
    acc[m.league].push(m);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([league, games]) => (
        <Card key={league} className="bg-[#0E1627] border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 bg-white/5">
            <span className="font-semibold text-sm">{league}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              {games.length} matches
            </Badge>
          </div>
          <div className="divide-y divide-white/5">
            {games.map((m) => {
              const isLive = m.status === "live" || m.status === "halftime";
              const isFinished = m.status === "finished";
              const isUpcoming = m.status === "upcoming";

              return (
                <div
                  key={m.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  {/* Teams */}
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="text-right text-sm truncate">{m.homeTeam}</span>
                    <span
                      className={cn(
                        "min-w-[72px] text-center px-3 py-1 rounded-full text-sm font-semibold",
                        isLive && "text-red-500 bg-red-500/10",
                        isFinished && "text-white bg-white/10",
                        isUpcoming && "text-muted-foreground bg-white/5"
                      )}
                    >
                      {isUpcoming ? m.startTime : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                    </span>
                    <span className="text-left text-sm truncate">{m.awayTeam}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="ml-4">
                    {isLive && (
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/40">
                        <Play className="h-3 w-3 mr-1" />
                        {m.minute ?? 0}'
                      </Badge>
                    )}
                    {m.status === "halftime" && (
                      <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/40">
                        HT
                      </Badge>
                    )}
                    {isUpcoming && (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {m.startTime}
                      </Badge>
                    )}
                    {isFinished && (
                      <Badge variant="outline" className="text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        FT
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
