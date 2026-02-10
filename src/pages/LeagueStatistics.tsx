import { useState, useMemo } from "react";
import { Trophy, Play, Users, Target, Calendar, RotateCcw, Swords, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLiveScores } from "@/hooks/useLiveScores";
import { LeagueStatsLiveTab } from "@/components/league-statistics/LeagueStatsLiveTab";
import { LeagueStatsEmptyState } from "@/components/league-statistics/LeagueStatsEmptyState";
import { LeagueStatsStandingsTab } from "@/components/league-statistics/LeagueStatsStandingsTab";
import { LeagueStatsScorersTab } from "@/components/league-statistics/LeagueStatsScorersTab";
import { LeagueStatsAssistsTab } from "@/components/league-statistics/LeagueStatsAssistsTab";
import { LeagueStatsFixturesTab } from "@/components/league-statistics/LeagueStatsFixturesTab";
import { LeagueStatsRoundsTab } from "@/components/league-statistics/LeagueStatsRoundsTab";
import { LeagueStatsH2HTab } from "@/components/league-statistics/LeagueStatsH2HTab";
import { LeagueSearchSelect } from "@/components/league-statistics/LeagueSearchSelect";
import { WebAdBanner } from "@/components/WebAdBanner";
// Known league ID mappings for API-Football
const LEAGUE_ID_MAP: Record<string, string> = {
  "Premier League": "39",
  "La Liga": "140",
  "Bundesliga": "78",
  "Serie A": "135",
  "Ligue 1": "61",
  "Champions League": "2",
  "Europa League": "3",
  "Eredivisie": "88",
  "Primeira Liga": "94",
  "Super Lig": "203",
  "Scottish Premiership": "179",
  "Championship": "40",
  "League One": "41",
  "League Two": "42",
  "FA Cup": "45",
  "EFL Cup": "48",
  "Copa del Rey": "143",
  "DFB Pokal": "81",
  "Coppa Italia": "137",
  "Coupe de France": "66",
  "MLS": "253",
  "A-League": "188",
  "Saudi Pro League": "307",
  "World Cup": "1",
  "Euro Championship": "4",
  "Conference League": "848",
};

export default function LeagueStatistics() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("live");
  const {
    matches,
    isLoading,
    error
  } = useLiveScores({
    dateMode: "today",
    statusFilter: "all"
  });

  // Extract unique leagues from today's matches dynamically
  const dynamicLeagues = useMemo(() => {
    const leagueMap = new Map<string, { id: string; name: string; matchCount: number }>();
    
    matches.forEach((match) => {
      const leagueName = match.league;
      if (!leagueName) return;
      
      // Try to find a known league ID, otherwise use the league name as ID
      const leagueId = LEAGUE_ID_MAP[leagueName] || leagueName.toLowerCase().replace(/\s+/g, "-");
      
      if (leagueMap.has(leagueName)) {
        const existing = leagueMap.get(leagueName)!;
        existing.matchCount++;
      } else {
        leagueMap.set(leagueName, { id: leagueId, name: leagueName, matchCount: 1 });
      }
    });

    // Sort by match count (most matches first), then alphabetically
    return Array.from(leagueMap.values()).sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.name.localeCompare(b.name);
    });
  }, [matches]);

  // Combined leagues list: "All Leagues" + dynamic leagues from today
  const allLeagues = useMemo(() => {
    return [{ id: "all", name: "All Leagues", matchCount: matches.length }, ...dynamicLeagues];
  }, [dynamicLeagues, matches.length]);

  const selectedLeague = allLeagues.find(l => l.id === selectedLeagueId);
  const isAllLeagues = selectedLeagueId === "all";

  // Filter matches for Live tab
  const filteredMatches = useMemo(() => {
    if (isAllLeagues) return matches;
    const leagueName = selectedLeague?.name || "";
    return matches.filter(m => m.league.toLowerCase() === leagueName.toLowerCase());
  }, [matches, isAllLeagues, selectedLeague]);
  const liveCount = filteredMatches.filter(m => m.status === "live" || m.status === "halftime").length;
  return <div className="section-gap max-w-full overflow-x-hidden">
        {/* Header - COMPACT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <BarChart3 className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold sm:text-base text-foreground">All Leagues Standings</h1>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Stats & rankings</p>
            </div>
          </div>

          {/* League Selector - Searchable */}
          <LeagueSearchSelect
            leagues={allLeagues}
            value={selectedLeagueId}
            onValueChange={setSelectedLeagueId}
            placeholder="Select League"
            className="w-full sm:w-[160px]"
            compact
          />
        </div>

        {/* Stats Summary - COMPACT cards */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          <Card className="flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/15">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Live</p>
              <p className="text-[10px] sm:text-xs font-bold text-destructive">{liveCount}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-success/10 to-success/5 border-success/15">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-success/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Matches</p>
              <p className="text-[10px] sm:text-xs font-bold text-success">{filteredMatches.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-accent/10 to-accent/5 border-accent/15">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Selected</p>
              <p className="text-[9px] sm:text-[10px] font-semibold text-accent truncate">
                {isAllLeagues ? "All" : selectedLeague?.name?.split(" ")[0]}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-1 p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase">Leagues</p>
              <p className="text-[10px] sm:text-xs font-bold text-primary">{dynamicLeagues.length}</p>
            </div>
          </Card>
        </div>

        {/* Tabs - Enhanced visibility with container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full p-2 sm:p-3 rounded-xl bg-card/80 border border-primary/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
              {[
                { value: "live", icon: Play, label: "Live" },
                { value: "standings", icon: Trophy, label: "Standings" },
                { value: "scorers", icon: Target, label: "Scorers" },
                { value: "assists", icon: Users, label: "Assists" },
                { value: "fixtures", icon: Calendar, label: "Fixtures" },
                { value: "rounds", icon: RotateCcw, label: "Rounds" },
                { value: "h2h", icon: Swords, label: "H2H" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-300 whitespace-nowrap max-w-full
                    ${activeTab === value 
                      ? "bg-[hsl(171,77%,36%)] text-white shadow-lg shadow-[rgba(15,155,142,0.4)] border-2 border-[hsl(171,77%,36%)] scale-[1.02]" 
                      : "bg-muted/50 text-muted-foreground border border-border/50 hover:text-foreground hover:border-primary/50 hover:bg-muted hover:shadow-[0_0_15px_rgba(15,155,142,0.2)]"
                    }
                  `}
                >
                  <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${activeTab === value ? "" : "opacity-70"}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Tab - always shows content */}
          <TabsContent value="live" className="mt-4">
            <LeagueStatsLiveTab matches={filteredMatches} isLoading={isLoading} error={error} isAllLeagues={isAllLeagues} leagueName={selectedLeague?.name} />
          </TabsContent>

          {/* Standings tab - shows grid for All Leagues, detailed view for specific league */}
          <TabsContent value="standings" className="mt-4">
            <LeagueStatsStandingsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
          </TabsContent>

          {/* Other tabs - show empty state if "All Leagues" selected */}

          <TabsContent value="scorers" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="scorers" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsScorersTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="assists" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="assists" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsAssistsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="fixtures" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="fixtures" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsFixturesTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="rounds" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="rounds" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsRoundsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="h2h" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="h2h" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsH2HTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>
        </Tabs>

        {/* Footer Ad */}
        <WebAdBanner className="mt-4" />
      </div>;
}