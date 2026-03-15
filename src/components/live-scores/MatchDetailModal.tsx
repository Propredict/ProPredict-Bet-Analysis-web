import { useEffect, useCallback, useState, useMemo } from "react";
import { X, BarChart3, Users, TrendingUp, History, Activity, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match } from "@/hooks/useLiveScores";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { useTeamStats } from "@/hooks/useTeamStats";
import { useMatchOdds } from "@/hooks/useMatchOdds";
import { StatisticsTab } from "./tabs/StatisticsTab";
import { LineupsTab } from "./tabs/LineupsTab";
import { OddsTab } from "./tabs/OddsTab";
import { H2HTab } from "./tabs/H2HTab";
import { SeasonStatsTab } from "./tabs/SeasonStatsTab";
import { PlayersTab } from "./tabs/PlayersTab";


interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");

  const { data: details, loading, error } = useMatchDetails(match?.id ?? null);

  const homeTeamId = details?.teams?.home?.id;
  const awayTeamId = details?.teams?.away?.id;
  const leagueId = details?.league?.id;
  const { data: teamStatsData, isLoading: teamStatsLoading } = useTeamStats(
    homeTeamId, awayTeamId, leagueId,
    activeTab === "season-stats"
  );

  // Lazy-load odds when user clicks on Odds tab OR to check availability
  const { odds: lazyOdds, loading: oddsLoading } = useMatchOdds(
    match?.id ?? null,
    activeTab === "odds" || !loading
  );

  // Determine which optional tabs have data
  const hasPlayers = !loading && (details?.players?.length ?? 0) > 0;
  
  const hasOdds = !oddsLoading && lazyOdds.length > 0;
  const hasLineups = !loading && details?.lineups?.some(l => l.startXI?.length > 0);

  // Build visible tabs dynamically
  const visibleTabs = useMemo(() => {
    const tabs = [
      { value: "statistics", label: "Stats", icon: BarChart3, always: true },
      { value: "lineups", label: "Lineups", icon: Users, always: false, hasData: hasLineups },
      { value: "players", label: "Players", icon: UserCheck, always: false, hasData: hasPlayers },
      { value: "season-stats", label: "Season", icon: Activity, always: true },
      { value: "odds", label: "Odds", icon: TrendingUp, always: false, hasData: hasOdds },
      { value: "h2h", label: "H2H", icon: History, always: true },
    ];
    // While loading, show all tabs; after loading, hide empty optional tabs
    if (loading || oddsLoading) return tabs;
    return tabs.filter(t => t.always || t.hasData);
  }, [loading, oddsLoading, hasPlayers, hasLineups, hasOdds]);

  // Reset to stats if current tab got hidden
  useEffect(() => {
    if (!loading && !visibleTabs.some(t => t.value === activeTab)) {
      setActiveTab("statistics");
    }
  }, [visibleTabs, loading, activeTab]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (match) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [match, handleEscape]);

  if (!match) return null;

  const isUpcoming = match.status === "upcoming";

  const getStatusBadge = () => {
    if (match.status === "live") {
      return <Badge className="bg-destructive text-destructive-foreground animate-pulse">LIVE {match.minute}'</Badge>;
    }
    if (match.status === "halftime") {
      return <Badge className="bg-accent text-accent-foreground">HT</Badge>;
    }
    if (match.status === "finished") {
      return <Badge variant="secondary">FT</Badge>;
    }
    return <Badge variant="outline">{match.startTime}</Badge>;
  };

  const homeLogo = details?.teams?.home?.logo;
  const awayLogo = details?.teams?.away?.logo;

  const colCount = visibleTabs.length;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-xl bg-[#1a1f2e] border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <div className="flex gap-3 items-center text-sm text-muted-foreground">
              {match.league} • {match.leagueCountry}
              {getStatusBadge()}
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* SCORE */}
          <div className="p-6 flex justify-between items-center">
            <div className="text-center flex-1 flex flex-col items-center gap-2">
              {homeLogo && (
                <img src={homeLogo} alt="" className="w-10 h-10 object-contain" />
              )}
              <span className="text-sm font-medium">{match.homeTeam}</span>
            </div>
            <div className="text-4xl font-bold px-4">
              {isUpcoming ? "VS" : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`}
            </div>
            <div className="text-center flex-1 flex flex-col items-center gap-2">
              {awayLogo && (
                <img src={awayLogo} alt="" className="w-10 h-10 object-contain" />
              )}
              <span className="text-sm font-medium">{match.awayTeam}</span>
            </div>
          </div>

          {/* TABS */}
          {!details && (loading || error) ? (
            <div className="border-t border-white/10 p-5">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-20 w-full rounded bg-muted/60" />
                  <div className="h-20 w-full rounded bg-muted/40" />
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-sm font-medium text-foreground">Couldn’t load match details</p>
                  <p className="mt-1 text-xs text-muted-foreground">{error ?? "Please close and try opening this match again."}</p>
                </div>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-3 py-3 border-b border-white/10">
                <TabsList
                  className="w-full gap-1 bg-secondary/50 p-1.5 rounded-lg border border-border"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
                >
                  {visibleTabs.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-[9px] sm:text-xs rounded-md py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                    >
                      <Icon className="h-3 w-3 mr-0.5 hidden sm:inline" /> {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="statistics" className="m-0">
                <StatisticsTab
                  statistics={details?.statistics ?? []}
                  events={details?.events ?? []}
                  loading={loading}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                />
              </TabsContent>

              <TabsContent value="players" className="m-0">
                <PlayersTab
                  players={details?.players ?? []}
                  loading={loading}
                />
              </TabsContent>


              <TabsContent value="season-stats" className="m-0">
                <SeasonStatsTab
                  homeStats={teamStatsData?.home ?? null}
                  awayStats={teamStatsData?.away ?? null}
                  loading={teamStatsLoading}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                />
              </TabsContent>

              <TabsContent value="lineups" className="m-0">
                <LineupsTab
                  lineups={details?.lineups ?? []}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="odds" className="m-0">
                <OddsTab
                  odds={lazyOdds}
                  loading={oddsLoading}
                />
              </TabsContent>

              <TabsContent value="h2h" className="m-0">
                <H2HTab
                  h2h={details?.h2h ?? []}
                  loading={loading}
                  homeTeamName={match.homeTeam}
                  awayTeamName={match.awayTeam}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}