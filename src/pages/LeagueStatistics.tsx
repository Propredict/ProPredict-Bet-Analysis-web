import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Trophy, Play, Users, Target, Calendar, RotateCcw, Swords, BarChart3, UserCheck, AlertTriangle, Square, ShieldAlert, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLiveScores } from "@/hooks/useLiveScores";
import { LeagueStatsEmptyState } from "@/components/league-statistics/LeagueStatsEmptyState";
import { LeagueStatsStandingsTab } from "@/components/league-statistics/LeagueStatsStandingsTab";
import { LeagueStatsScorersTab } from "@/components/league-statistics/LeagueStatsScorersTab";
import { LeagueStatsAssistsTab } from "@/components/league-statistics/LeagueStatsAssistsTab";
import { LeagueStatsFixturesTab } from "@/components/league-statistics/LeagueStatsFixturesTab";
import { LeagueStatsRoundsTab } from "@/components/league-statistics/LeagueStatsRoundsTab";
import { LeagueStatsH2HTab } from "@/components/league-statistics/LeagueStatsH2HTab";
import { LeagueStatsPlayersTab } from "@/components/league-statistics/LeagueStatsPlayersTab";
import { LeagueStatsInjuriesTab } from "@/components/league-statistics/LeagueStatsInjuriesTab";
import { LeagueStatsYellowCardsTab } from "@/components/league-statistics/LeagueStatsYellowCardsTab";
import { LeagueStatsRedCardsTab } from "@/components/league-statistics/LeagueStatsRedCardsTab";
import { LeagueStatsSquadsTab } from "@/components/league-statistics/LeagueStatsSquadsTab";
import { LeagueSearchSelect } from "@/components/league-statistics/LeagueSearchSelect";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import AdSlot from "@/components/ads/AdSlot";
import { PageHero } from "@/components/layout/PageHero";
import { HeroStat } from "@/components/layout/HeroStat";
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
  const [activeTab, setActiveTab] = useState("standings");
  const { maybeShowInterstitial } = useAndroidInterstitial();

  useEffect(() => {
    maybeShowInterstitial("league_statistics");
  }, [maybeShowInterstitial]);
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
  return <>
    <Helmet>
      <title>League Statistics & Standings – ProPredict</title>
      <meta name="description" content="Live league standings, top scorers, assists, fixtures, and head-to-head stats across all major football leagues. AI-powered sports analysis." />
      <meta property="og:title" content="League Statistics & Standings – ProPredict" />
      <meta property="og:description" content="Live league standings, top scorers, assists, fixtures, and head-to-head stats across all major football leagues." />
      <meta property="og:image" content="https://propredict.me/og-image.png" />
      <meta property="og:url" content="https://propredict.me/league-statistics" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap max-w-full overflow-x-hidden">
        {/* Header - COMPACT */}
        <PageHero
          title="All Leagues Standings"
          subtitle="Stats, rankings and team performance from around the world"
          icon={BarChart3}
          actions={
            <LeagueSearchSelect
              leagues={allLeagues}
              value={selectedLeagueId}
              onValueChange={setSelectedLeagueId}
              placeholder="Select League"
              className="w-full sm:w-[180px]"
              compact
            />
          }
        />

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <HeroStat icon={Play} label="Live" value={liveCount} caption="Matches in play" tone="live" />
          <HeroStat icon={Trophy} label="Matches" value={filteredMatches.length} caption="Total matches today" tone="success" />
          <HeroStat icon={Users} tone="sky" label="Selected" value={isAllLeagues ? "All Leagues" : selectedLeague?.name ?? "—"} caption="Current selection" />
          <HeroStat icon={Target} label="Leagues" value={dynamicLeagues.length} caption="Active leagues" />
        </div>

        {/* Tabs - Enhanced visibility with container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full rounded-2xl border-2 border-primary/30 bg-card p-2 shadow-md sm:p-3">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
              {[
                { value: "standings", icon: Trophy, label: "Standings" },
                { value: "players", icon: UserCheck, label: "Players" },
                { value: "squads", icon: UsersRound, label: "Squads" },
                { value: "scorers", icon: Target, label: "Scorers" },
                { value: "assists", icon: Users, label: "Assists" },
                { value: "yellowcards", icon: Square, label: "🟨 Cards" },
                { value: "redcards", icon: ShieldAlert, label: "🟥 Cards" },
                { value: "injuries", icon: AlertTriangle, label: "Injuries" },
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
                      ? "bg-primary text-primary-foreground shadow-md border-2 border-primary scale-[1.02]"
                      : "bg-secondary/60 text-muted-foreground border border-primary/20 hover:text-primary hover:border-primary/50 hover:bg-secondary"
                    }
                  `}
                >
                  <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${activeTab === value ? "" : "opacity-70"}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Standings tab - shows grid for All Leagues, detailed view for specific league */}
          <TabsContent value="standings" className="mt-4">
            <LeagueStatsStandingsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />
          </TabsContent>

          {/* Other tabs - show empty state if "All Leagues" selected */}

          <TabsContent value="players" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="players" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsPlayersTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="injuries" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="injuries" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsInjuriesTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

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

          <TabsContent value="yellowcards" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="yellowcards" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsYellowCardsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="redcards" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="redcards" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsRedCardsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>

          <TabsContent value="squads" className="mt-4">
            {isAllLeagues ? <LeagueStatsEmptyState type="squads" onSelectLeague={setSelectedLeagueId} /> : <LeagueStatsSquadsTab leagueId={selectedLeagueId} leagueName={selectedLeague?.name || ""} />}
          </TabsContent>
        </Tabs>

        {/* Footer Ad */}
        <AdSlot />
      </div>
  </>;
}