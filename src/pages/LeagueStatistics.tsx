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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">League Statistics</h1>
              <p className="text-sm text-muted-foreground">
                Comprehensive stats, standings & player rankings
              </p>
            </div>
          </div>

          {/* League Selector */}
          <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
            <SelectTrigger className="w-[200px] bg-[#0E1627] border-white/10">
              <SelectValue placeholder="Select League" />
            </SelectTrigger>
            <SelectContent className="bg-[#0E1627] border-white/10">
              {LEAGUES.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Play className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Live Now</p>
                <p className="text-xl font-bold text-red-400">{liveCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Matches</p>
                <p className="text-xl font-bold text-green-400">{filteredMatches.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/5 border-orange-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selected League</p>
                <p className="text-sm font-semibold text-orange-400 truncate max-w-[120px]">
                  {isAllLeagues ? "All" : selectedLeague?.name}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Leagues</p>
                <p className="text-xl font-bold text-purple-400">{LEAGUES.length - 1}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-[#0E1627] border border-white/10 p-1 overflow-x-auto">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Live
            </TabsTrigger>
            <TabsTrigger value="standings" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="scorers" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scorers
            </TabsTrigger>
            <TabsTrigger value="assists" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assists
            </TabsTrigger>
            <TabsTrigger value="fixtures" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fixtures
            </TabsTrigger>
            <TabsTrigger value="rounds" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Rounds
            </TabsTrigger>
            <TabsTrigger value="h2h" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              H2H
            </TabsTrigger>
          </TabsList>

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
