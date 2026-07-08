import { Trophy, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLeagueStandings, StandingsResponse, TeamStanding } from "@/hooks/useLeagueStats";

interface LeagueStatsStandingsTabProps {
  leagueId: string;
  leagueName: string;
}

interface LeagueInfo {
  id: string;
  name: string;
  flag: string;
  category: LeagueCategory;
  keywords?: string[];
}

// Top leagues shown by default
const topLeagues: LeagueInfo[] = [
  { id: "39", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", category: "top5", keywords: ["premier", "epl", "england"] },
  { id: "140", name: "La Liga", flag: "🇪🇸", category: "top5", keywords: ["la liga", "spain", "espana"] },
  { id: "78", name: "Bundesliga", flag: "🇩🇪", category: "top5", keywords: ["bundesliga", "germany"] },
  { id: "135", name: "Serie A", flag: "🇮🇹", category: "top5", keywords: ["serie a", "italy"] },
  { id: "61", name: "Ligue 1", flag: "🇫🇷", category: "top5", keywords: ["ligue 1", "france"] },
  { id: "88", name: "Eredivisie", flag: "🇳🇱", category: "major", keywords: ["eredivisie", "netherlands", "holland"] },
  { id: "94", name: "Primeira Liga", flag: "🇵🇹", category: "major", keywords: ["primeira", "portugal", "liga portugal"] },
  { id: "203", name: "Süper Lig", flag: "🇹🇷", category: "major", keywords: ["super lig", "turkey", "turkiye"] },
];

// Extended searchable league list (available via search/filter)
const allLeagues: LeagueInfo[] = [
  ...topLeagues,
  // Major European
  { id: "144", name: "Belgian Pro League", flag: "🇧🇪", category: "major", keywords: ["belgium", "jupiler"] },
  { id: "179", name: "Scottish Premiership", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", category: "major", keywords: ["scotland", "spl", "premiership"] },
  { id: "218", name: "Austrian Bundesliga", flag: "🇦🇹", category: "major", keywords: ["austria", "bundesliga"] },
  { id: "207", name: "Swiss Super League", flag: "🇨🇭", category: "major", keywords: ["switzerland", "swiss"] },
  { id: "113", name: "Allsvenskan", flag: "🇸🇪", category: "major", keywords: ["sweden", "allsvenskan"] },
  { id: "103", name: "Eliteserien", flag: "🇳🇴", category: "major", keywords: ["norway", "eliteserien"] },
  { id: "119", name: "Danish Superliga", flag: "🇩🇰", category: "major", keywords: ["denmark", "superliga"] },
  { id: "106", name: "Ekstraklasa", flag: "🇵🇱", category: "major", keywords: ["poland", "ekstraklasa"] },
  { id: "235", name: "Russian Premier League", flag: "🇷🇺", category: "major", keywords: ["russia", "rpl"] },
  { id: "333", name: "Ukrainian Premier League", flag: "🇺🇦", category: "major", keywords: ["ukraine", "upl"] },
  // International club competitions
  { id: "2", name: "Champions League", flag: "🇪🇺", category: "international", keywords: ["ucl", "champions league", "cl"] },
  { id: "3", name: "Europa League", flag: "🇪🇺", category: "international", keywords: ["uel", "europa league"] },
  { id: "848", name: "Conference League", flag: "🇪🇺", category: "international", keywords: ["conference", "uecl"] },
  // Americas
  { id: "71", name: "Brasileirão", flag: "🇧🇷", category: "americas", keywords: ["brazil", "brasileirao", "serie a"] },
  { id: "253", name: "Major League Soccer", flag: "🇺🇸", category: "americas", keywords: ["mls", "usa", "united states"] },
  { id: "262", name: "Liga MX", flag: "🇲🇽", category: "americas", keywords: ["mexico", "liga mx", "mx"] },
  { id: "128", name: "Argentine Primera División", flag: "🇦🇷", category: "americas", keywords: ["argentina", "primera"] },
  { id: "130", name: "Chilean Primera División", flag: "🇨🇱", category: "americas", keywords: ["chile", "primera"] },
  // Asia
  { id: "98", name: "J1 League", flag: "🇯🇵", category: "asia", keywords: ["japan", "j1", "j league"] },
  { id: "292", name: "K League 1", flag: "🇰🇷", category: "asia", keywords: ["korea", "k league", "k1"] },
  { id: "188", name: "A-League", flag: "🇦🇺", category: "asia", keywords: ["australia", "a league"] },
  { id: "169", name: "Chinese Super League", flag: "🇨🇳", category: "asia", keywords: ["china", "csl", "super league"] },
  { id: "307", name: "Saudi Pro League", flag: "🇸🇦", category: "asia", keywords: ["saudi", "pro league", "spl"] },
  { id: "305", name: "UAE Pro League", flag: "🇦🇪", category: "asia", keywords: ["uae", "dubai", "pro league"] },
];

type LeagueCategory = "all" | "top5" | "major" | "international" | "americas" | "asia";
const filters: { value: LeagueCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "top5", label: "Top 5" },
  { value: "major", label: "Major" },
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
    <Card className="bg-gradient-to-br from-primary/15 via-primary/10 to-card border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-primary/20 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="font-semibold text-xs sm:text-sm">Standings</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{flag} {leagueName}</span>
      </div>

      {/* Mobile list (no horizontal scroll) + desktop table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error || displayTeams.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No data available
        </div>
      ) : (
        <>
          <div className="sm:hidden divide-y divide-white/5">
            {displayTeams.map((team: TeamStanding) => (
              <StandingsRowMobile key={team.rank} team={team} />
            ))}
          </div>

          <div className="hidden sm:block">
            <table className="w-full text-xs min-w-0">
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
          </div>
        </>
      )}

      {/* Legend - wrap on mobile */}
      <div className="px-3 sm:px-4 py-2 border-t border-primary/20 flex flex-wrap gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-muted-foreground">
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
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-card border-primary/20">
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
        <TabsList className="w-full bg-card border border-primary/20 p-1 h-auto">
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
          <Card className="bg-gradient-to-br from-primary/15 via-primary/10 to-card border-primary/20 overflow-hidden">
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
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-white/5">
                  {standings.map((team: TeamStanding) => {
                    const stats = filter === "all" ? team.all : filter === "home" ? team.home : team.away;
                    const played = stats?.played || team.all.played;
                    const win = stats?.win || team.all.win;
                    const draw = stats?.draw || team.all.draw;
                    const lose = stats?.lose || team.all.lose;
                    const goalsFor = stats?.goals?.for || team.all.goals.for;
                    const goalsAgainst = stats?.goals?.against || team.all.goals.against;

                    return (
                      <StandingsRowMobile
                        key={team.rank}
                        team={team}
                        overrides={{ played, win, draw, lose, goalsFor, goalsAgainst }}
                      />
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full text-xs sm:text-sm min-w-0">
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
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StandingsRowMobile({
  team,
  overrides,
}: {
  team: TeamStanding;
  overrides?: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsFor: number;
    goalsAgainst: number;
  };
}) {
  const played = overrides?.played ?? team.all.played;
  const win = overrides?.win ?? team.all.win;
  const draw = overrides?.draw ?? team.all.draw;
  const lose = overrides?.lose ?? team.all.lose;
  const goalsFor = overrides?.goalsFor ?? team.all.goals.for;
  const goalsAgainst = overrides?.goalsAgainst ?? team.all.goals.against;

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex-shrink-0 w-6 text-center font-bold",
            getPositionColor(team.rank, team.description)
          )}
        >
          {team.rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {team.team.logo && (
              <img
                src={team.team.logo}
                alt=""
                className="w-4 h-4 object-contain flex-shrink-0"
              />
            )}
            <span className="font-medium truncate">{team.team.name}</span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>P {played}</span>
            <span className="text-green-400">W {win}</span>
            <span className="text-yellow-400">D {draw}</span>
            <span className="text-red-400">L {lose}</span>
            <span>G {goalsFor}:{goalsAgainst}</span>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="font-bold text-primary">{team.points}</div>
          <div className="text-xs text-muted-foreground">Pts</div>
        </div>
      </div>
    </div>
  );
}

// Grid of league cards with search + filter (default: 8 featured leagues)
function LeagueCardsGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LeagueCategory>("all");

  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  const isDefaultView = !hasQuery && category === "all";

  // Default "All" view: show only featured top leagues
  // Any filter or search: use the full extended list
  const baseLeagues = isDefaultView ? topLeagues : allLeagues;

  const filteredLeagues = baseLeagues.filter((league) => {
    const matchesCategory = category === "all" || league.category === category;
    const matchesSearch =
      !normalizedQuery ||
      league.name.toLowerCase().includes(normalizedQuery) ||
      league.flag === normalizedQuery ||
      league.keywords?.some((kw) => kw.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search leagues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-card border-primary/20 focus-visible:ring-primary/50"
          />
        </div>

        <ToggleGroup
          type="single"
          value={category}
          onValueChange={(value) => value && setCategory(value as LeagueCategory)}
          className="bg-card border border-primary/20 p-1 rounded-lg flex-wrap justify-start sm:justify-end"
        >
          {filters.map((f) => (
            <ToggleGroupItem
              key={f.value}
              value={f.value}
              className={cn(
                "text-xs px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              )}
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {filteredLeagues.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No leagues found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredLeagues.map((league) => (
            <LeagueStandingsCard
              key={league.id}
              leagueId={league.id}
              leagueName={league.name}
              flag={league.flag}
            />
          ))}
        </div>
      )}
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
        <Card className="p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-card border-primary/20">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Detailed standings for selected league */}
      <SingleLeagueStandings leagueId={leagueId} leagueName={leagueName} />

      {/* League cards grid below */}
      <LeagueCardsGrid />
    </div>
  );
}
