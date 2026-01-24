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
            <div key={i} className="animate-pulse bg-muted/30 rounded-lg h-16" />
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
      const matchHomeTeam = match.teams?.home?.name;
      const homeTeamWonMatch = homeGoals > awayGoals;

      // Check if current home team was home team in H2H match
      if (matchHomeTeam === homeTeam) {
        if (homeTeamWonMatch) homeWins++;
        else awayWins++;
      } else if (matchHomeTeam === awayTeam) {
        if (homeTeamWonMatch) awayWins++;
        else homeWins++;
      } else {
        // Fallback: count by match result
        if (homeTeamWonMatch) homeWins++;
        else awayWins++;
      }
    }
  });

  const shortHomeTeam = homeTeam?.split(' ').slice(0, 2).join(' ') || "Home";
  const shortAwayTeam = awayTeam?.split(' ').slice(0, 2).join(' ') || "Away";

  return (
    <div className="max-h-[450px] overflow-y-auto">
      {/* Summary Stats - matching reference design */}
      <div className="py-4 px-6 border-b border-border/30">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">{homeWins}</div>
            <div className="text-xs text-muted-foreground mt-1">{shortHomeTeam} Wins</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-muted-foreground">{draws}</div>
            <div className="text-xs text-muted-foreground mt-1">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{awayWins}</div>
            <div className="text-xs text-muted-foreground mt-1">{shortAwayTeam} Wins</div>
          </div>
        </div>
      </div>

      {/* Last Meetings - matching reference layout */}
      <div className="p-4">
        <div className="text-sm text-muted-foreground font-medium mb-3">
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
                className="bg-[#0F172A] rounded-lg px-4 py-3"
              >
                {/* Row layout: Date/League on left, Teams+Score on right */}
                <div className="flex items-center">
                  {/* Left side: Date and League */}
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    <span className="text-[10px] bg-muted/40 px-2 py-0.5 rounded text-muted-foreground font-medium mt-1 w-fit">
                      {match.league?.name || "League"}
                    </span>
                  </div>

                  {/* Right side: Teams and Score */}
                  <div className="flex items-center flex-1 justify-end gap-2">
                    {/* Home Team */}
                    {match.teams?.home?.logo && (
                      <img src={match.teams.home.logo} alt="" className="w-5 h-5 object-contain" />
                    )}
                    <span className={cn(
                      "text-sm",
                      homeWon ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}>
                      {match.teams?.home?.name || "Home"}
                    </span>

                    {/* Score */}
                    <div className="flex items-center gap-1 mx-2 bg-muted/30 px-2 py-0.5 rounded">
                      <span className={cn(
                        "text-sm font-bold",
                        homeWon ? "text-emerald-400" : "text-foreground"
                      )}>
                        {homeGoals}
                      </span>
                      <span className="text-muted-foreground text-sm">-</span>
                      <span className={cn(
                        "text-sm font-bold",
                        awayWon ? "text-orange-400" : "text-foreground"
                      )}>
                        {awayGoals}
                      </span>
                    </div>

                    {/* Away Team */}
                    <span className={cn(
                      "text-sm",
                      awayWon ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}>
                      {match.teams?.away?.name || "Away"}
                    </span>
                    {match.teams?.away?.logo && (
                      <img src={match.teams.away.logo} alt="" className="w-5 h-5 object-contain" />
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
