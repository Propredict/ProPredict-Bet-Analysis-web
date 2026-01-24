import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LeagueStatsStandingsTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock standings data for demo
const mockLeagueStandings: Record<string, { name: string; country: string; flag: string; teams: TeamStanding[] }> = {
  "39": {
    name: "Premier League",
    country: "England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    teams: [
      { pos: 1, name: "Arsenal", logo: "🔴", mp: 22, w: 15, d: 5, l: 2, gf: 40, ga: 14, gd: 26, pts: 50, form: ["D", "D", "D", "W", "W"] },
      { pos: 2, name: "Manchester City", logo: "🔵", mp: 22, w: 13, d: 4, l: 5, gf: 45, ga: 21, gd: 24, pts: 43, form: ["L", "D", "D", "W", "W"] },
      { pos: 3, name: "Aston Villa", logo: "🟣", mp: 22, w: 13, d: 4, l: 5, gf: 33, ga: 25, gd: 8, pts: 43, form: ["L", "D", "W", "L", "W"] },
      { pos: 4, name: "Liverpool", logo: "🔴", mp: 22, w: 10, d: 6, l: 6, gf: 33, ga: 29, gd: 4, pts: 36, form: ["D", "D", "W", "L", "D"] },
      { pos: 5, name: "Manchester United", logo: "🔴", mp: 22, w: 9, d: 8, l: 5, gf: 38, ga: 32, gd: 6, pts: 35, form: ["W", "W", "L", "D", "W"] },
      { pos: 6, name: "Chelsea", logo: "🔵", mp: 22, w: 9, d: 7, l: 6, gf: 36, ga: 24, gd: 12, pts: 34, form: ["L", "W", "W", "D", "L"] },
      { pos: 7, name: "Brentford", logo: "🔴", mp: 22, w: 10, d: 3, l: 9, gf: 35, ga: 30, gd: 5, pts: 33, form: ["W", "L", "D", "W", "W"] },
      { pos: 8, name: "Newcastle", logo: "⚫", mp: 22, w: 9, d: 6, l: 7, gf: 32, ga: 27, gd: 5, pts: 33, form: ["W", "W", "L", "D", "L"] },
      { pos: 9, name: "Sunderland", logo: "🔴", mp: 23, w: 8, d: 9, l: 6, gf: 24, ga: 26, gd: -2, pts: 33, form: ["D", "W", "L", "D", "W"] },
      { pos: 10, name: "Everton", logo: "🔵", mp: 22, w: 9, d: 5, l: 8, gf: 24, ga: 25, gd: -1, pts: 32, form: ["L", "W", "D", "W", "L"] },
      { pos: 11, name: "Fulham", logo: "⚪", mp: 22, w: 9, d: 4, l: 9, gf: 30, ga: 31, gd: -1, pts: 31, form: ["L", "W", "W", "D", "L"] },
      { pos: 12, name: "Brighton", logo: "🔵", mp: 22, w: 7, d: 9, l: 6, gf: 32, ga: 29, gd: 3, pts: 30, form: ["W", "D", "L", "W", "D"] },
      { pos: 13, name: "Crystal Palace", logo: "🔴", mp: 22, w: 7, d: 7, l: 8, gf: 23, ga: 25, gd: -2, pts: 28, form: ["L", "D", "W", "L", "D"] },
      { pos: 14, name: "Tottenham", logo: "⚪", mp: 22, w: 7, d: 6, l: 9, gf: 31, ga: 29, gd: 2, pts: 27, form: ["L", "L", "D", "W", "W"] },
      { pos: 15, name: "Bournemouth", logo: "🔴", mp: 22, w: 6, d: 9, l: 7, gf: 35, ga: 41, gd: -6, pts: 27, form: ["D", "W", "L", "L", "D"] },
      { pos: 16, name: "Leeds", logo: "⚪", mp: 22, w: 6, d: 7, l: 9, gf: 30, ga: 37, gd: -7, pts: 25, form: ["W", "W", "L", "D", "L"] },
      { pos: 17, name: "Nottingham Forest", logo: "🔴", mp: 22, w: 6, d: 4, l: 12, gf: 21, ga: 34, gd: -13, pts: 22, form: ["D", "W", "L", "L", "E"] },
      { pos: 18, name: "West Ham", logo: "🟣", mp: 23, w: 5, d: 5, l: 13, gf: 27, ga: 45, gd: -18, pts: 20, form: ["W", "W", "L", "L", "E"] },
      { pos: 19, name: "Burnley", logo: "🟣", mp: 22, w: 3, d: 5, l: 14, gf: 23, ga: 42, gd: -19, pts: 14, form: ["D", "D", "W", "L", "L"] },
      { pos: 20, name: "Wolves", logo: "🟠", mp: 22, w: 1, d: 5, l: 16, gf: 15, ga: 41, gd: -26, pts: 8, form: ["D", "D", "W", "D", "L"] },
    ]
  },
  "140": {
    name: "La Liga",
    country: "Spain",
    flag: "🇪🇸",
    teams: [
      { pos: 1, name: "Barcelona", logo: "🔴", mp: 20, w: 16, d: 1, l: 3, gf: 48, ga: 16, gd: 32, pts: 49, form: ["W", "W", "D", "W", "W"] },
      { pos: 2, name: "Real Madrid", logo: "⚪", mp: 20, w: 15, d: 3, l: 2, gf: 42, ga: 16, gd: 26, pts: 48, form: ["W", "D", "W", "W", "W"] },
      { pos: 3, name: "Villarreal", logo: "🟡", mp: 19, w: 13, d: 2, l: 4, gf: 36, ga: 18, gd: 18, pts: 41, form: ["W", "L", "W", "W", "D"] },
      { pos: 4, name: "Atletico Madrid", logo: "🔴", mp: 20, w: 12, d: 5, l: 3, gf: 35, ga: 17, gd: 18, pts: 41, form: ["D", "W", "W", "L", "W"] },
      { pos: 5, name: "Espanyol", logo: "🔵", mp: 20, w: 10, d: 4, l: 6, gf: 28, ga: 27, gd: 1, pts: 34, form: ["L", "W", "D", "W", "W"] },
      { pos: 6, name: "Real Betis", logo: "🟢", mp: 20, w: 8, d: 8, l: 4, gf: 24, ga: 20, gd: 4, pts: 32, form: ["D", "W", "L", "D", "W"] },
      { pos: 7, name: "Celta Vigo", logo: "🔵", mp: 20, w: 8, d: 8, l: 4, gf: 28, ga: 20, gd: 8, pts: 32, form: ["W", "D", "D", "W", "L"] },
      { pos: 8, name: "Elche", logo: "🟢", mp: 21, w: 5, d: 9, l: 7, gf: 18, ga: 18, gd: 0, pts: 24, form: ["L", "D", "W", "L", "D"] },
    ]
  },
  "78": {
    name: "Bundesliga",
    country: "Germany",
    flag: "🇩🇪",
    teams: [
      { pos: 1, name: "Bayern München", logo: "🔴", mp: 18, w: 16, d: 2, l: 0, gf: 57, ga: 0, gd: 57, pts: 50, form: ["W", "W", "W", "W", "W"] },
      { pos: 2, name: "Borussia Dortmund", logo: "🟡", mp: 18, w: 11, d: 6, l: 1, gf: 36, ga: 18, gd: 18, pts: 39, form: ["D", "W", "W", "D", "W"] },
      { pos: 3, name: "1899 Hoffenheim", logo: "🔵", mp: 17, w: 10, d: 3, l: 4, gf: 33, ga: 19, gd: 14, pts: 33, form: ["W", "L", "W", "D", "W"] },
      { pos: 4, name: "VfB Stuttgart", logo: "🔴", mp: 18, w: 10, d: 3, l: 5, gf: 30, ga: 23, gd: 7, pts: 33, form: ["L", "W", "D", "W", "W"] },
      { pos: 5, name: "RB Leipzig", logo: "🔴", mp: 17, w: 10, d: 2, l: 5, gf: 28, ga: 19, gd: 9, pts: 32, form: ["W", "W", "L", "D", "W"] },
      { pos: 6, name: "Bayer Leverkusen", logo: "🔴", mp: 17, w: 9, d: 2, l: 6, gf: 27, ga: 18, gd: 9, pts: 29, form: ["L", "W", "W", "D", "L"] },
      { pos: 7, name: "Eintracht Frankfurt", logo: "⚫", mp: 18, w: 7, d: 6, l: 5, gf: 25, ga: 26, gd: -1, pts: 27, form: ["D", "L", "W", "D", "W"] },
      { pos: 8, name: "SC Freiburg", logo: "⚫", mp: 18, w: 6, d: 6, l: 6, gf: 22, ga: 24, gd: -2, pts: 24, form: ["L", "D", "W", "L", "D"] },
    ]
  },
  "135": {
    name: "Serie A",
    country: "Italy",
    flag: "🇮🇹",
    teams: [
      { pos: 1, name: "Inter", logo: "🔵", mp: 22, w: 17, d: 1, l: 4, gf: 48, ga: 17, gd: 31, pts: 52, form: ["W", "W", "D", "W", "W"] },
      { pos: 2, name: "AC Milan", logo: "🔴", mp: 21, w: 13, d: 7, l: 1, gf: 38, ga: 20, gd: 18, pts: 46, form: ["D", "W", "W", "W", "D"] },
      { pos: 3, name: "Napoli", logo: "🔵", mp: 21, w: 13, d: 4, l: 4, gf: 36, ga: 22, gd: 14, pts: 43, form: ["W", "L", "W", "D", "W"] },
      { pos: 4, name: "AS Roma", logo: "🟠", mp: 21, w: 14, d: 0, l: 7, gf: 35, ga: 21, gd: 14, pts: 42, form: ["W", "W", "L", "W", "L"] },
      { pos: 5, name: "Juventus", logo: "⚫", mp: 21, w: 11, d: 6, l: 4, gf: 30, ga: 15, gd: 15, pts: 39, form: ["D", "W", "D", "W", "W"] },
      { pos: 6, name: "Como", logo: "🔵", mp: 21, w: 10, d: 7, l: 4, gf: 32, ga: 17, gd: 15, pts: 37, form: ["W", "D", "W", "L", "D"] },
      { pos: 7, name: "Atalanta", logo: "🔵", mp: 21, w: 8, d: 8, l: 5, gf: 26, ga: 20, gd: 6, pts: 32, form: ["D", "L", "W", "D", "W"] },
      { pos: 8, name: "Bologna", logo: "🔴", mp: 21, w: 8, d: 6, l: 7, gf: 26, ga: 20, gd: 6, pts: 30, form: ["L", "W", "D", "W", "L"] },
    ]
  },
};

interface TeamStanding {
  pos: number;
  name: string;
  logo: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: string[];
}

const topLeagueIds = ["39", "140", "78", "135"];

function getFormColor(result: string) {
  switch (result) {
    case "W": return "bg-green-500";
    case "D": return "bg-yellow-500";
    case "L": return "bg-red-500";
    default: return "bg-muted";
  }
}

function getPositionColor(pos: number) {
  if (pos <= 4) return "text-green-400";
  if (pos <= 6) return "text-blue-400";
  if (pos >= 18) return "text-red-400";
  return "text-foreground";
}

// Compact standings card for "All Leagues" view
function LeagueStandingsCard({ leagueId }: { leagueId: string }) {
  const league = mockLeagueStandings[leagueId];
  if (!league) return null;

  const displayTeams = league.teams.slice(0, 8);

  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">League Standings</span>
        <span className="text-xs text-muted-foreground">{league.flag} {league.name}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-muted-foreground">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-center">P</th>
              <th className="px-3 py-2 text-center text-green-400">W</th>
              <th className="px-3 py-2 text-center text-yellow-400">D</th>
              <th className="px-3 py-2 text-center text-red-400">L</th>
              <th className="px-3 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center text-primary">Pts</th>
            </tr>
          </thead>
          <tbody>
            {displayTeams.map((team) => (
              <tr key={team.pos} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className={cn("px-3 py-2 font-medium", getPositionColor(team.pos))}>{team.pos}</td>
                <td className="px-3 py-2 font-medium">{team.name}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">{team.mp}</td>
                <td className="px-3 py-2 text-center text-green-400">{team.w}</td>
                <td className="px-3 py-2 text-center text-yellow-400">{team.d}</td>
                <td className="px-3 py-2 text-center text-red-400">{team.l}</td>
                <td className={cn("px-3 py-2 text-center", team.gd > 0 ? "text-green-400" : team.gd < 0 ? "text-red-400" : "text-muted-foreground")}>
                  {team.gd > 0 ? `+${team.gd}` : team.gd}
                </td>
                <td className="px-3 py-2 text-center font-bold text-primary">{team.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-white/5 flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Champions League
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Europa League
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Relegation
        </span>
      </div>
    </Card>
  );
}

// Full standings table for single league view
function SingleLeagueStandings({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [filter, setFilter] = useState<"all" | "home" | "away">("all");
  const league = mockLeagueStandings[leagueId];

  // Fallback to Premier League data if league not found
  const data = league || mockLeagueStandings["39"];
  const displayName = league?.name || leagueName;
  const flag = league?.flag || "🏆";
  const country = league?.country || "";

  return (
    <div className="space-y-4">
      {/* League Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-semibold">{displayName} Standings</span>
        </div>
        {country && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>{flag}</span>
            <span>{country} : {displayName}</span>
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
              {displayName}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground text-xs">
                    <th className="px-3 py-3 text-left w-8"></th>
                    <th className="px-3 py-3 text-left"></th>
                    <th className="px-3 py-3 text-center">MP</th>
                    <th className="px-3 py-3 text-center text-green-400">W</th>
                    <th className="px-3 py-3 text-center text-yellow-400">D</th>
                    <th className="px-3 py-3 text-center text-red-400">L</th>
                    <th className="px-3 py-3 text-center">G</th>
                    <th className="px-3 py-3 text-center">+/-</th>
                    <th className="px-3 py-3 text-center">P</th>
                    <th className="px-3 py-3 text-center">FORM</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((team) => (
                    <tr key={team.pos} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className={cn("px-3 py-3 font-bold", getPositionColor(team.pos))}>
                        {team.pos}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{team.logo}</span>
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{team.mp}</td>
                      <td className="px-3 py-3 text-center text-green-400">{team.w}</td>
                      <td className="px-3 py-3 text-center text-yellow-400">{team.d}</td>
                      <td className="px-3 py-3 text-center text-red-400">{team.l}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{team.gf}:{team.ga}</td>
                      <td className={cn("px-3 py-3 text-center", team.gd > 0 ? "text-green-400" : team.gd < 0 ? "text-red-400" : "")}>
                        {team.gd}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-primary">{team.pts}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {team.form.map((result, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white",
                                getFormColor(result)
                              )}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function LeagueStatsStandingsTab({ leagueId, leagueName }: LeagueStatsStandingsTabProps) {
  const isAllLeagues = leagueId === "all";

  if (isAllLeagues) {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topLeagueIds.map((id) => (
            <LeagueStandingsCard key={id} leagueId={id} />
          ))}
        </div>
      </div>
    );
  }

  return <SingleLeagueStandings leagueId={leagueId} leagueName={leagueName} />;
}
