import { useState, useMemo } from "react";
import { Trophy, Play, Users, Target, Calendar, RotateCcw, Swords, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { LeagueStatsLiveTab } from "@/components/league-statistics/LeagueStatsLiveTab";
import { LeagueStatsEmptyState } from "@/components/league-statistics/LeagueStatsEmptyState";
import { LeagueStatsStandingsTab } from "@/components/league-statistics/LeagueStatsStandingsTab";
import { LeagueStatsScorersTab } from "@/components/league-statistics/LeagueStatsScorersTab";
import { LeagueStatsAssistsTab } from "@/components/league-statistics/LeagueStatsAssistsTab";
import { LeagueStatsFixturesTab } from "@/components/league-statistics/LeagueStatsFixturesTab";
import { LeagueStatsRoundsTab } from "@/components/league-statistics/LeagueStatsRoundsTab";
import { LeagueStatsH2HTab } from "@/components/league-statistics/LeagueStatsH2HTab";

const LEAGUES = [
  { id: "all", name: "All Leagues" },
  { id: "39", name: "Premier League" },
  { id: "140", name: "La Liga" },
  { id: "78", name: "Bundesliga" },
  { id: "135", name: "Serie A" },
  { id: "61", name: "Ligue 1" },
  { id: "2", name: "Champions League" },
  { id: "3", name: "Europa League" },
];

export default function LeagueStatistics() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("live");

  const { matches, isLoading, error } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  const selectedLeague = LEAGUES.find((l) => l.id === selectedLeagueId);
  const isAllLeagues = selectedLeagueId === "all";

  // Filter matches for Live tab
  const filteredMatches = useMemo(() => {
    if (isAllLeagues) return matches;
    const leagueName = selectedLeague?.name || "";
    return matches.filter((m) =>
      m.league.toLowerCase().includes(leagueName.toLowerCase())
    );
  }, [matches, isAllLeagues, selectedLeague]);

  const liveCount = filteredMatches.filter(
    (m) => m.status === "live" || m.status === "halftime"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-5 md:space-y-6 max-w-full overflow-x-hidden">
        {/* Header - Clean desktop layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">League Statistics</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Stats, standings & rankings</p>
            </div>
          </div>

          {/* League Selector */}
          <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
            <SelectTrigger className="w-full sm:w-[220px] bg-card border-border">
              <SelectValue placeholder="Select League" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {LEAGUES.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary - Uniform cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="stats-card bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/15">
            <div className="stats-card-icon bg-destructive/10">
              <Play className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
            </div>
            <div>
              <p className="stats-card-label">Live Now</p>
              <p className="stats-card-value text-destructive">{liveCount}</p>
            </div>
          </Card>
          <Card className="stats-card bg-gradient-to-br from-success/10 to-success/5 border-success/15">
            <div className="stats-card-icon bg-success/10">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-success" />
            </div>
            <div>
              <p className="stats-card-label">Matches</p>
              <p className="stats-card-value text-success">{filteredMatches.length}</p>
            </div>
          </Card>
          <Card className="stats-card bg-gradient-to-br from-accent/10 to-accent/5 border-accent/15">
            <div className="stats-card-icon bg-accent/10">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            </div>
            <div>
              <p className="stats-card-label">Selected</p>
              <p className="text-sm md:text-base font-semibold text-accent truncate">
                {isAllLeagues ? "All Leagues" : selectedLeague?.name}
              </p>
            </div>
          </Card>
          <Card className="stats-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15">
            <div className="stats-card-icon bg-primary/10">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <p className="stats-card-label">Leagues</p>
              <p className="stats-card-value text-primary">{LEAGUES.length - 1}</p>
            </div>
          </Card>
        </div>

        {/* Tabs - Clean horizontal layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:w-full bg-secondary/50 border border-border p-1 rounded-lg">
              <TabsTrigger value="live" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Play className="h-4 w-4" />
                <span className="hidden xs:inline">Live</span>
              </TabsTrigger>
              <TabsTrigger value="standings" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Trophy className="h-4 w-4" />
                <span className="hidden xs:inline">Standings</span>
              </TabsTrigger>
              <TabsTrigger value="scorers" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Target className="h-4 w-4" />
                <span className="hidden xs:inline">Scorers</span>
              </TabsTrigger>
              <TabsTrigger value="assists" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Assists</span>
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden xs:inline">Fixtures</span>
              </TabsTrigger>
              <TabsTrigger value="rounds" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden xs:inline">Rounds</span>
              </TabsTrigger>
              <TabsTrigger value="h2h" className="flex items-center gap-2 px-3 md:px-4 text-sm">
                <Swords className="h-4 w-4" />
                <span className="hidden xs:inline">H2H</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Live Tab - always shows content */}
          <TabsContent value="live" className="mt-4">
            <LeagueStatsLiveTab
              matches={filteredMatches}
              isLoading={isLoading}
              error={error}
              isAllLeagues={isAllLeagues}
              leagueName={selectedLeague?.name}
            />
          </TabsContent>

          {/* Standings tab - shows grid for All Leagues, detailed view for specific league */}
          <TabsContent value="standings" className="mt-4">
            <LeagueStatsStandingsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
          </TabsContent>

          {/* Other tabs - show empty state if "All Leagues" selected */}

          <TabsContent value="scorers" className="mt-4">
            {isAllLeagues ? (
              <LeagueStatsEmptyState type="scorers" onSelectLeague={setSelectedLeagueId} />
            ) : (
              <LeagueStatsScorersTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
            )}
          </TabsContent>

          <TabsContent value="assists" className="mt-4">
            {isAllLeagues ? (
              <LeagueStatsEmptyState type="assists" onSelectLeague={setSelectedLeagueId} />
            ) : (
              <LeagueStatsAssistsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
            )}
          </TabsContent>

          <TabsContent value="fixtures" className="mt-4">
            {isAllLeagues ? (
              <LeagueStatsEmptyState type="fixtures" onSelectLeague={setSelectedLeagueId} />
            ) : (
              <LeagueStatsFixturesTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
            )}
          </TabsContent>

          <TabsContent value="rounds" className="mt-4">
            {isAllLeagues ? (
              <LeagueStatsEmptyState type="rounds" onSelectLeague={setSelectedLeagueId} />
            ) : (
              <LeagueStatsRoundsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
            )}
          </TabsContent>

          <TabsContent value="h2h" className="mt-4">
            {isAllLeagues ? (
              <LeagueStatsEmptyState type="h2h" onSelectLeague={setSelectedLeagueId} />
            ) : (
              <LeagueStatsH2HTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
