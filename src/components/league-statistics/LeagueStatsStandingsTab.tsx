import { Trophy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLeagueStandings, StandingsResponse, TeamStanding } from "@/hooks/useLeagueStats";

interface LeagueStatsStandingsTabProps {
  leagueId: string;
  leagueName: string;
}

// Top leagues for grid view
const topLeagues = [
  { id: "39", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "140", name: "La Liga", flag: "🇪🇸" },
  { id: "78", name: "Bundesliga", flag: "🇩🇪" },
  { id: "135", name: "Serie A", flag: "🇮🇹" },
];

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500";
    case "D": return "bg-yellow-500";
    case "L": return "bg-red-500";
    default: return "bg-muted";
  }
}

function getPositionColor(pos: number, description?: string) {
  if (description?.toLowerCase().includes("champions league")) return "text-green-400";
  if (description?.toLowerCase().includes("europa")) return "text-blue-400";
  if (description?.toLowerCase().includes("relegation")) return "text-red-400";
  if (pos <= 4) return "text-green-400";
  if (pos <= 6) return "text-blue-400";
  if (pos >= 18) return "text-red-400";
  return "text-foreground";
}

// Compact standings card for grid view
function LeagueStandingsCard({ leagueId, leagueName, flag }: { leagueId: string; leagueName: string; flag: string }) {
  const { data, isLoading, error } = useLeagueStandings(leagueId);
  
  const standings = (data as StandingsResponse)?.standings || [];
  const displayTeams = standings.slice(0, 8);

  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="font-semibold text-xs sm:text-sm">Standings</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{flag} {leagueName}</span>
      </div>

      {/* Table with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error || displayTeams.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <table className="w-full text-xs min-w-[320px]">
            <thead>
              <tr className="border-b border-white/5 text-muted-foreground">
                <th className="px-2 sm:px-3 py-2 text-left w-6">#</th>
                <th className="px-2 sm:px-3 py-2 text-left">Team</th>
                <th className="px-1 sm:px-3 py-2 text-center">P</th>
                <th className="px-1 sm:px-3 py-2 text-center text-green-400">W</th>
                <th className="px-1 sm:px-3 py-2 text-center text-yellow-400">D</th>
                <th className="px-1 sm:px-3 py-2 text-center text-red-400">L</th>
                <th className="px-1 sm:px-3 py-2 text-center hidden sm:table-cell">GD</th>
                <th className="px-1 sm:px-3 py-2 text-center text-primary">Pts</th>
              </tr>
            </thead>
            <tbody>
              {displayTeams.map((team: TeamStanding) => (
                <tr key={team.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className={cn("px-2 sm:px-3 py-2 font-medium", getPositionColor(team.rank, team.description))}>{team.rank}</td>
                  <td className="px-2 sm:px-3 py-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {team.team.logo && (
                        <img src={team.team.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[60px] sm:max-w-[100px]">{team.team.name}</span>
                    </div>
                  </td>
                  <td className="px-1 sm:px-3 py-2 text-center text-muted-foreground">{team.all.played}</td>
                  <td className="px-1 sm:px-3 py-2 text-center text-green-400">{team.all.win}</td>
                  <td className="px-1 sm:px-3 py-2 text-center text-yellow-400">{team.all.draw}</td>
                  <td className="px-1 sm:px-3 py-2 text-center text-red-400">{team.all.lose}</td>
                  <td className={cn("px-1 sm:px-3 py-2 text-center hidden sm:table-cell", team.goalsDiff > 0 ? "text-green-400" : team.goalsDiff < 0 ? "text-red-400" : "text-muted-foreground")}>
                    {team.goalsDiff > 0 ? `+${team.goalsDiff}` : team.goalsDiff}
                  </td>
                  <td className="px-1 sm:px-3 py-2 text-center font-bold text-primary">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend - wrap on mobile */}
      <div className="px-3 sm:px-4 py-2 border-t border-white/5 flex flex-wrap gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          UCL
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          UEL
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Rel.
        </span>
      </div>
    </Card>
  );
}

// Full standings table for single league view
function SingleLeagueStandings({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [filter, setFilter] = useState<"all" | "home" | "away">("all");
  const { data, isLoading, error } = useLeagueStandings(leagueId);

  const response = data as StandingsResponse | null;
  const standings = response?.standings || [];
  const league = response?.league;

  return (
    <div className="space-y-4">
      {/* League Header */}
      <Card className="p-3 sm:p-4 bg-[#0E1627] border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base">{leagueName}</span>
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            📊 Updated after round
          </span>
        </div>
        {league && (
          <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
            {league.flag && <img src={league.flag} alt="" className="w-4 h-3 sm:w-5 sm:h-3 object-cover" />}
            <span className="truncate">{league.country} : {league.name}</span>
          </div>
        )}
      </Card>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "home" | "away")}>
        <TabsList className="w-full bg-[#0E1627] border border-white/10 p-1 h-auto">
          <TabsTrigger 
            value="all" 
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All
          </TabsTrigger>
          <TabsTrigger 
            value="home" 
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Home
          </TabsTrigger>
          <TabsTrigger 
            value="away" 
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Away
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="px-4 py-3 bg-primary/20 text-center font-semibold text-sm">
              {leagueName}
            </div>

            {/* Loading / Error / Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error || standings.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                No standings data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground text-[10px] sm:text-xs">
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left w-6 sm:w-8">#</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left">Team</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center">MP</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center text-green-400">W</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center text-yellow-400">D</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center text-red-400">L</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center hidden sm:table-cell">G</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center hidden sm:table-cell">+/-</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center">P</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center hidden md:table-cell">FORM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team: TeamStanding) => {
                      // Use filter to show all/home/away stats
                      const stats = filter === "all" ? team.all : filter === "home" ? team.home : team.away;
                      const played = stats?.played || team.all.played;
                      const win = stats?.win || team.all.win;
                      const draw = stats?.draw || team.all.draw;
                      const lose = stats?.lose || team.all.lose;
                      const goalsFor = stats?.goals?.for || team.all.goals.for;
                      const goalsAgainst = stats?.goals?.against || team.all.goals.against;

                      return (
                        <tr key={team.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className={cn("px-2 sm:px-3 py-2 sm:py-3 font-bold", getPositionColor(team.rank, team.description))}>
                            {team.rank}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-3">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {team.team.logo && (
                                <img src={team.team.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" />
                              )}
                              <span className="font-medium truncate max-w-[80px] sm:max-w-none">{team.team.name}</span>
                            </div>
                          </td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-muted-foreground">{played}</td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-green-400">{win}</td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-yellow-400">{draw}</td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-red-400">{lose}</td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-muted-foreground hidden sm:table-cell">{goalsFor}:{goalsAgainst}</td>
                          <td className={cn("px-1 sm:px-3 py-2 sm:py-3 text-center hidden sm:table-cell", team.goalsDiff > 0 ? "text-green-400" : team.goalsDiff < 0 ? "text-red-400" : "")}>
                            {team.goalsDiff}
                          </td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-bold text-primary">{team.points}</td>
                          <td className="px-1 sm:px-3 py-2 sm:py-3 hidden md:table-cell">
                            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                              {team.form.slice(0, 5).map((result: string, idx: number) => (
                                <span
                                  key={idx}
                                  className={cn(
                                    "w-4 h-4 sm:w-5 sm:h-5 rounded text-[8px] sm:text-[10px] font-bold flex items-center justify-center text-white",
                                    getFormColor(result)
                                  )}
                                >
                                  {result}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Grid of league cards (shown at bottom or standalone)
function LeagueCardsGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {topLeagues.map((league) => (
        <LeagueStandingsCard key={league.id} leagueId={league.id} leagueName={league.name} flag={league.flag} />
      ))}
    </div>
  );
}

export function LeagueStatsStandingsTab({ leagueId, leagueName }: LeagueStatsStandingsTabProps) {
  const isAllLeagues = leagueId === "all";

  if (isAllLeagues) {
    // All Leagues view: header + grid
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-4 bg-[#0E1627] border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold">All Leagues Standings</span>
          </div>
        </Card>

        {/* Grid of League Cards */}
        <LeagueCardsGrid />
      </div>
    );
  }

  // Single league view: detailed table + grid below
  return (
    <div className="space-y-8">
      {/* Detailed standings for selected league */}
      <SingleLeagueStandings leagueId={leagueId} leagueName={leagueName} />

      {/* League cards grid below */}
      <LeagueCardsGrid />
    </div>
  );
}
