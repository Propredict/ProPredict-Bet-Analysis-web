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
              <div className="h-10 w-12 mx-auto bg-muted rounded mb-2" />
              <div className="h-3 w-20 mx-auto bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted/30 rounded-lg h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!h2h || h2h.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <History className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No head-to-head data</p>
        <p className="text-xs text-muted-foreground">These teams may not have played recently</p>
      </div>
    );
  }

  // Calculate H2H summary based on current match teams
  const homeTeam = homeTeamName;
  const awayTeam = awayTeamName;

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  h2h.forEach((match) => {
    const homeGoals = match.goals?.home ?? 0;
    const awayGoals = match.goals?.away ?? 0;

    if (homeGoals === awayGoals) {
      draws++;
    } else {
      // Determine which team won this H2H match
      const matchHomeTeam = match.teams?.home?.name;
      const matchAwayTeam = match.teams?.away?.name;
      const homeTeamWonMatch = homeGoals > awayGoals;

      if (matchHomeTeam === homeTeam || matchAwayTeam === awayTeam) {
        if ((matchHomeTeam === homeTeam && homeTeamWonMatch) || (matchAwayTeam === homeTeam && !homeTeamWonMatch)) {
          homeWins++;
        } else {
          awayWins++;
        }
      } else {
        // Fallback: just count by match position
        if (homeTeamWonMatch) homeWins++;
        else awayWins++;
      }
    }
  });

  const shortHomeTeam = homeTeam?.split(' ').slice(0, 2).join(' ') || "Home";
  const shortAwayTeam = awayTeam?.split(' ').slice(0, 2).join(' ') || "Away";

  return (
    <div className="max-h-[450px] overflow-y-auto">
      {/* Summary Stats */}
      <div className="p-4 border-b border-border/30">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">{homeWins}</div>
            <div className="text-xs text-muted-foreground mt-1">{shortHomeTeam} Wins</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-muted-foreground">{draws}</div>
            <div className="text-xs text-muted-foreground mt-1">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{awayWins}</div>
            <div className="text-xs text-muted-foreground mt-1">{shortAwayTeam} Wins</div>
          </div>
        </div>
      </div>

      {/* Last Meetings */}
      <div className="p-4">
        <div className="text-xs text-muted-foreground font-medium mb-3">
          Last {Math.min(h2h.length, 10)} Meetings
        </div>

        <div className="space-y-2">
          {h2h.slice(0, 10).map((match, idx) => {
            const homeGoals = match.goals?.home ?? 0;
            const awayGoals = match.goals?.away ?? 0;
            const homeWon = homeGoals > awayGoals;
            const awayWon = awayGoals > homeGoals;

            let formattedDate = "";
            try {
              formattedDate = format(new Date(match.fixture.date), "dd MMM yyyy");
            } catch {
              formattedDate = "—";
            }

            return (
              <div
                key={idx}
                className="bg-card/30 rounded-lg p-3 border border-border/30"
              >
                {/* Date & League */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground">{formattedDate}</span>
                  <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded text-muted-foreground">
                    {match.league?.name || "League"}
                  </span>
                </div>

                {/* Match Row */}
                <div className="flex items-center">
                  {/* Home Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.teams?.home?.logo && (
                      <img src={match.teams.home.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      homeWon && "font-semibold text-foreground"
                    )}>
                      {match.teams?.home?.name || "Home"}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="px-4 flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-lg font-bold",
                      homeWon ? "text-emerald-400" : "text-foreground"
                    )}>
                      {homeGoals}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className={cn(
                      "text-lg font-bold",
                      awayWon ? "text-primary" : "text-foreground"
                    )}>
                      {awayGoals}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className={cn(
                      "text-sm truncate",
                      awayWon && "font-semibold text-foreground"
                    )}>
                      {match.teams?.away?.name || "Away"}
                    </span>
                    {match.teams?.away?.logo && (
                      <img src={match.teams.away.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
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
