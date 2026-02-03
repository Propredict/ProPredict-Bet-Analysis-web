import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Loader2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLeagueStandings, type StandingsResponse } from "@/hooks/useLeagueStats";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POPULAR_LEAGUES = [
  { id: "39", name: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "140", name: "La Liga", country: "Spain", flag: "🇪🇸" },
  { id: "135", name: "Serie A", country: "Italy", flag: "🇮🇹" },
  { id: "78", name: "Bundesliga", country: "Germany", flag: "🇩🇪" },
  { id: "61", name: "Ligue 1", country: "France", flag: "🇫🇷" },
];

export function LeagueStandings() {
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState(POPULAR_LEAGUES[0]);
  // Use 2025 season to match League Statistics page
  const { data, isLoading, error } = useLeagueStandings(selectedLeague.id, "2025");

  const standings = (data as StandingsResponse)?.standings ?? [];
  const displayedStandings = standings.slice(0, 5);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">League Standings</h2>
        </div>

        {/* League Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-card/50 border-border/50 hover:bg-secondary/50"
            >
              <span className="mr-1">{selectedLeague.flag}</span>
              <span className="hidden sm:inline">{selectedLeague.name}</span>
              <span className="sm:hidden">{selectedLeague.name.split(" ")[0]}</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border z-50">
            {POPULAR_LEAGUES.map((league) => (
              <DropdownMenuItem
                key={league.id}
                onClick={() => setSelectedLeague(league)}
                className="text-xs cursor-pointer"
              >
                <span className="mr-2">{league.flag}</span>
                {league.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <div className="p-3 border-t border-border/30 bg-background/50">
            <Button
              variant="ghost"
              className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 group transition-all duration-300 hover:shadow-[0_0_20px_rgba(15,155,142,0.4)] animate-[pulse_3s_ease-in-out_infinite]"
              onClick={() => navigate("/league-statistics")}
            >
              <Trophy className="h-4 w-4 mr-1.5 text-primary" />
              <span className="text-xs text-primary">View full standings & more leagues</span>
              <ChevronRight className="h-4 w-4 ml-1 text-primary transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
