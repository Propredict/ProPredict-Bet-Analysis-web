import { useState, useMemo } from "react";
import { Trophy, Play, Users, Target, Calendar, RotateCcw, Swords, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { LeagueStatsLiveTab } from "@/components/league-statistics/LeagueStatsLiveTab";
import { LeagueStatsEmptyState } from "@/components/league-statistics/LeagueStatsEmptyState";
import { LeagueStatsStandingsTab } from "@/components/league-statistics/LeagueStatsStandingsTab";
import { LeagueStatsScorersTab } from "@/components/league-statistics/LeagueStatsScorersTab";
import { LeagueStatsAssistsTab } from "@/components/league-statistics/LeagueStatsAssistsTab";
import { LeagueStatsFixturesTab } from "@/components/league-statistics/LeagueStatsFixturesTab";
import { LeagueStatsRoundsTab } from "@/components/league-statistics/LeagueStatsRoundsTab";
import { LeagueStatsH2HTab } from "@/components/league-statistics/LeagueStatsH2HTab";
const LEAGUES = [{
  id: "all",
  name: "All Leagues"
}, {
  id: "39",
  name: "Premier League"
}, {
  id: "140",
  name: "La Liga"
}, {
  id: "78",
  name: "Bundesliga"
}, {
  id: "135",
  name: "Serie A"
}, {
  id: "61",
  name: "Ligue 1"
}, {
  id: "2",
  name: "Champions League"
}, {
  id: "3",
  name: "Europa League"
}];
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
  const selectedLeague = LEAGUES.find(l => l.id === selectedLeagueId);
  const isAllLeagues = selectedLeagueId === "all";

  // Filter matches for Live tab
  const filteredMatches = useMemo(() => {
    if (isAllLeagues) return matches;
    const leagueName = selectedLeague?.name || "";
    return matches.filter(m => m.league.toLowerCase().includes(leagueName.toLowerCase()));
  }, [matches, isAllLeagues, selectedLeague]);
  const liveCount = filteredMatches.filter(m => m.status === "live" || m.status === "halftime").length;
  return <div className="section-gap max-w-full overflow-x-hidden">
        {/* Header - COMPACT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-1.5 pb-1 sm:pb-1.5 border-b border-border">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
              <BarChart3 className="h-3 w-3 text-accent sm:w-[20px] sm:h-[20px]" />
            </div>
            <div>
              <h1 className="text-xs font-bold sm:text-base">All Leagues Standings</h1>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Stats & rankings</p>
            </div>
          </div>

          {/* League Selector - Compact */}
          <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
            <SelectTrigger className="w-full sm:w-[140px] h-6 sm:h-7 text-[9px] sm:text-[10px] bg-card border-border">
              <SelectValue placeholder="Select League" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {LEAGUES.map(league => <SelectItem key={league.id} value={league.id} className="text-[10px]">
                  {league.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
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
              <p className="text-[10px] sm:text-xs font-bold text-primary">{LEAGUES.length - 1}</p>
            </div>
          </Card>
        </div>

        {/* Tabs - Horizontal scroll on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-1.5 px-1.5">
            <TabsList className="inline-flex w-auto min-w-full bg-secondary/50 border border-border p-0.5 rounded-md">
              <TabsTrigger value="live" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Live</span>
              </TabsTrigger>
              <TabsTrigger value="standings" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Standings</span>
              </TabsTrigger>
              <TabsTrigger value="scorers" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Scorers</span>
              </TabsTrigger>
              <TabsTrigger value="assists" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Assists</span>
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Fixtures</span>
              </TabsTrigger>
              <TabsTrigger value="rounds" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Rounds</span>
              </TabsTrigger>
              <TabsTrigger value="h2h" className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]">
                <Swords className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>H2H</span>
              </TabsTrigger>
            </TabsList>
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
      </div>;
}