import { H2HMatch } from "@/hooks/useMatchDetails";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

interface H2HTabProps {
  h2h: H2HMatch[];
  loading: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function H2HTab({ h2h, loading, homeTeamName, awayTeamName }: H2HTabProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse text-center">
              <div className="h-8 w-12 mx-auto bg-muted rounded mb-2" />
              <div className="h-3 w-16 mx-auto bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted/30 rounded-lg h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!h2h || h2h.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <History className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Head-to-head data not available</p>
        <p className="text-xs text-muted-foreground/60 mt-1">These teams may not have played recently</p>
      </div>
    );
  }

  // Calculate H2H summary
  const homeTeam = homeTeamName || h2h[0]?.teams?.home?.name;
  const awayTeam = awayTeamName || h2h[0]?.teams?.away?.name;

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  h2h.forEach((match) => {
    const homeGoals = match.goals?.home ?? 0;
    const awayGoals = match.goals?.away ?? 0;

    // Check if current home team was home or away in this H2H match
    const isCurrentHomeTeamHome = match.teams?.home?.name === homeTeam;

    if (homeGoals === awayGoals) {
      draws++;
    } else if (homeGoals > awayGoals) {
      if (isCurrentHomeTeamHome) homeWins++;
      else awayWins++;
    } else {
      if (isCurrentHomeTeamHome) awayWins++;
      else homeWins++;
    }
  });

  return (
    <div className="p-4 max-h-[400px] overflow-y-auto space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400">{homeWins}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {homeTeam?.split(' ').slice(0, 2).join(' ') || "Home"} Wins
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-muted-foreground">{draws}</div>
          <div className="text-xs text-muted-foreground mt-1">Draws</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{awayWins}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {awayTeam?.split(' ').slice(0, 2).join(' ') || "Away"} Wins
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Last Meetings */}
      <div>
        <div className="text-xs text-muted-foreground font-medium mb-3">
          Last {Math.min(h2h.length, 10)} Meetings
        </div>

        <div className="space-y-2">
          {h2h.slice(0, 10).map((match, idx) => {
            const homeGoals = match.goals?.home ?? 0;
            const awayGoals = match.goals?.away ?? 0;
            const homeWon = homeGoals > awayGoals;
            const awayWon = awayGoals > homeGoals;
            const isDraw = homeGoals === awayGoals;

            let formattedDate = "";
            try {
              formattedDate = format(new Date(match.fixture.date), "dd MMM yyyy");
            } catch {
              formattedDate = "—";
            }

            return (
              <div
                key={idx}
                className="bg-card/30 rounded-lg p-3 border border-border/30 hover:border-border/50 transition-colors"
              >
                {/* Date & League Row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{formattedDate}</span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded text-[10px]">
                    {match.league?.name || "League"}
                  </span>
                </div>

                {/* Teams & Score Row */}
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.teams?.home?.logo && (
                      <img
                        src={match.teams.home.logo}
                        alt=""
                        className="w-5 h-5 object-contain flex-shrink-0"
                      />
                    )}
                    <span
                      className={cn(
                        "text-sm truncate",
                        homeWon && "font-semibold text-foreground"
                      )}
                    >
                      {match.teams?.home?.name || "Home"}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="px-4 flex items-center gap-1">
                    <span
                      className={cn(
                        "text-lg font-bold",
                        homeWon ? "text-emerald-400" : isDraw ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {homeGoals}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span
                      className={cn(
                        "text-lg font-bold",
                        awayWon ? "text-primary" : isDraw ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {awayGoals}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span
                      className={cn(
                        "text-sm truncate",
                        awayWon && "font-semibold text-foreground"
                      )}
                    >
                      {match.teams?.away?.name || "Away"}
                    </span>
                    {match.teams?.away?.logo && (
                      <img
                        src={match.teams.away.logo}
                        alt=""
                        className="w-5 h-5 object-contain flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
