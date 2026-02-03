import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Loader2, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLeagueStandings, type StandingsResponse } from "@/hooks/useLeagueStats";

const PREMIER_LEAGUE_ID = "39";

export function LeagueStandings() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useLeagueStandings(PREMIER_LEAGUE_ID, "2024");

  const standings = (data as StandingsResponse)?.standings ?? [];
  const displayedStandings = standings.slice(0, 5);
  const league = (data as StandingsResponse)?.league;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">League Standings</h2>
            {league && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card/50 border border-border/50">
                <Flag className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{league.name}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary hover:bg-primary/10"
          onClick={() => navigate("/league-statistics")}
        >
          Premier League
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>

      {/* Standings Table */}
      <Card className="bg-card/50 border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : error || displayedStandings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Trophy className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No standings data available</p>
            <Button
              variant="link"
              size="sm"
              className="text-primary text-xs h-auto p-0"
              onClick={() => navigate("/league-statistics")}
            >
              Try selecting a different league
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {/* Table Header */}
            <div className="grid grid-cols-[32px_1fr_48px_48px_48px_48px] gap-1 px-3 py-2 bg-secondary/30 text-[10px] text-muted-foreground font-medium">
              <span className="text-center">#</span>
              <span>Team</span>
              <span className="text-center">P</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">Pts</span>
            </div>

            {/* Table Rows */}
            {displayedStandings.map((team) => (
              <div
                key={team.team.id}
                className="grid grid-cols-[32px_1fr_48px_48px_48px_48px] gap-1 px-3 py-2.5 items-center hover:bg-secondary/20 transition-colors"
              >
                <span className={`text-center text-xs font-semibold ${
                  team.rank <= 4 ? "text-primary" : 
                  team.rank >= standings.length - 2 ? "text-destructive" : 
                  "text-muted-foreground"
                }`}>
                  {team.rank}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={team.team.logo}
                    alt={team.team.name}
                    className="h-5 w-5 object-contain flex-shrink-0"
                  />
                  <span className="text-xs text-foreground truncate">{team.team.name}</span>
                </div>
                <span className="text-center text-xs text-muted-foreground">{team.all.played}</span>
                <span className="text-center text-xs text-muted-foreground">{team.all.win}</span>
                <span className="text-center text-xs text-muted-foreground">{team.all.draw}</span>
                <span className="text-center text-xs font-semibold text-foreground">{team.points}</span>
              </div>
            ))}
          </div>
        )}

        {/* See More CTA */}
        {displayedStandings.length > 0 && (
          <div className="p-3 border-t border-border/30">
            <Button
              variant="outline"
              className="w-full border-border/50 hover:border-primary/50 hover:bg-primary/5 group"
              onClick={() => navigate("/league-statistics")}
            >
              <span className="text-xs">View full standings & more leagues</span>
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
