import { useEffect, useCallback, useState } from "react";
import { X, BarChart3, Users, DollarSign, History, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";
import { supabase } from "@/integrations/supabase/client";

const MATCH_DETAILS_URL = "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-match-details";

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

interface StatItem {
  type: string;
  home: string | number | null;
  away: string | number | null;
}

interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
}

interface TeamLineup {
  team: { id: number; name: string; logo: string };
  formation: string | null;
  startXI: { player: LineupPlayer }[];
  substitutes: { player: LineupPlayer }[];
}

interface H2HMatch {
  fixture: { id: number; date: string };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

interface OddsValue {
  value: string;
  odd: string;
}

interface MatchDetails {
  statistics?: StatItem[];
  lineups?: TeamLineup[];
  odds?: OddsValue[];
  h2h?: H2HMatch[];
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const homePercent = (home / total) * 100;
  const awayPercent = (away / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{home}</span>
        <span className="font-medium text-foreground">{label}</span>
        <span>{away}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  );
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!match) return;

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [match, handleEscape]);

  useEffect(() => {
    if (!match) return;

    const fetchDetails = async () => {
      setActiveTab("statistics");
      setLoading(true);
      setError(null);
      setDetails(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${MATCH_DETAILS_URL}?fixtureId=${match.id}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to load match details (${response.status})`);
        }

        const data = await response.json();
        setDetails(data || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [match?.id]);

  if (!match) return null;

  const isLive = match.status === "live";
  const isHT = match.status === "halftime";
  const isFinished = match.status === "finished";
  const isUpcoming = !isLive && !isHT && !isFinished;

  // Parse statistics into a more usable format
  const getStatValue = (type: string): { home: number; away: number } => {
    if (!details?.statistics || !Array.isArray(details.statistics)) {
      return { home: 0, away: 0 };
    }
    const stat = details.statistics.find(s => s.type?.toLowerCase().includes(type.toLowerCase()));
    if (!stat) return { home: 0, away: 0 };
    
    const parseValue = (val: string | number | null): number => {
      if (val === null || val === undefined) return 0;
      const str = String(val).replace('%', '');
      return parseInt(str, 10) || 0;
    };
    
    return { home: parseValue(stat.home), away: parseValue(stat.away) };
  };

  const possession = getStatValue("possession");
  const shots = getStatValue("shots");
  const shotsOnTarget = getStatValue("on target");
  const corners = getStatValue("corner");
  const fouls = getStatValue("foul");

  const hasStats = details?.statistics && Array.isArray(details.statistics) && details.statistics.length > 0;
  const hasLineups = details?.lineups && Array.isArray(details.lineups) && details.lineups.length > 0;
  const hasOdds = details?.odds && Array.isArray(details.odds) && details.odds.length > 0;
  const hasH2H = details?.h2h && Array.isArray(details.h2h) && details.h2h.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-xl bg-[#1a1f2e] border border-white/10 overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-[#1a1f2e] to-[#252b3d]">
            <div className="flex gap-2 items-center text-sm text-muted-foreground">
              <span>{match.league}</span>
              {match.leagueCountry && (
                <>
                  <span>•</span>
                  <span>{match.leagueCountry}</span>
                </>
              )}
              {(isLive || isHT) && (
                <Badge className="bg-red-500 text-white animate-pulse ml-2">
                  {isHT ? "HT" : `LIVE ${match.minute}'`}
                </Badge>
              )}
              {isFinished && (
                <Badge variant="secondary" className="ml-2">FT</Badge>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* TEAMS & SCORE */}
          <div className="p-6 flex justify-between items-center bg-gradient-to-b from-[#252b3d]/50 to-transparent">
            {/* Home Team */}
            <div className="text-center flex-1">
              <div className="h-16 w-16 mx-auto mb-3 flex items-center justify-center">
                {match.homeLogo ? (
                  <img 
                    src={match.homeLogo} 
                    alt={match.homeTeam}
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={cn(
                  "h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center text-xl font-bold text-muted-foreground",
                  match.homeLogo && "hidden"
                )}>
                  {match.homeTeam?.charAt(0) || "H"}
                </div>
              </div>
              <div className="font-medium text-sm">{match.homeTeam}</div>
            </div>

            {/* Score */}
            <div className="text-center px-6">
              {isUpcoming ? (
                <div className="text-2xl font-bold text-muted-foreground">
                  {match.startTime || "TBD"}
                </div>
              ) : (
                <div className="text-4xl font-bold">
                  <span className="text-emerald-400">{match.homeScore ?? 0}</span>
                  <span className="text-muted-foreground mx-2">:</span>
                  <span className="text-blue-400">{match.awayScore ?? 0}</span>
                </div>
              )}
              {(isLive || isHT) && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs text-muted-foreground">Live updates</span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="text-center flex-1">
              <div className="h-16 w-16 mx-auto mb-3 flex items-center justify-center">
                {match.awayLogo ? (
                  <img 
                    src={match.awayLogo} 
                    alt={match.awayTeam}
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={cn(
                  "h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center text-xl font-bold text-muted-foreground",
                  match.awayLogo && "hidden"
                )}>
                  {match.awayTeam?.charAt(0) || "A"}
                </div>
              </div>
              <div className="font-medium text-sm">{match.awayTeam}</div>
            </div>
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-white/10 bg-transparent h-auto p-0 rounded-none">
              <TabsTrigger 
                value="statistics" 
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </TabsTrigger>
              <TabsTrigger 
                value="lineups"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Lineups
              </TabsTrigger>
              <TabsTrigger 
                value="odds"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Odds
              </TabsTrigger>
              <TabsTrigger 
                value="h2h"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
              >
                <History className="h-4 w-4 mr-2" />
                H2H
              </TabsTrigger>
            </TabsList>

            {/* CONTENT */}
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
              
              {error && (
                <EmptyState 
                  icon={AlertCircle} 
                  message={error} 
                />
              )}

              {!loading && !error && (
                <>
                  <TabsContent value="statistics" className="m-0">
                    {hasStats ? (
                      <div className="space-y-4">
                        <StatBar label="Possession %" home={possession.home} away={possession.away} />
                        <StatBar label="Total Shots" home={shots.home} away={shots.away} />
                        <StatBar label="Shots on Target" home={shotsOnTarget.home} away={shotsOnTarget.away} />
                        <StatBar label="Corners" home={corners.home} away={corners.away} />
                        <StatBar label="Fouls" home={fouls.home} away={fouls.away} />
                      </div>
                    ) : (
                      <EmptyState 
                        icon={BarChart3} 
                        message={isUpcoming 
                          ? "Statistics will be available once the match starts" 
                          : "No statistics available for this match"
                        } 
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="lineups" className="m-0">
                    {hasLineups ? (
                      <div className="grid grid-cols-2 gap-4">
                        {details.lineups?.map((lineup, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              {lineup.team?.logo && (
                                <img src={lineup.team.logo} alt="" className="h-5 w-5" />
                              )}
                              <span className="font-medium text-sm">{lineup.team?.name}</span>
                              {lineup.formation && (
                                <Badge variant="secondary" className="ml-auto text-xs">
                                  {lineup.formation}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              {lineup.startXI?.slice(0, 11).map((item, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/20">
                                  <span className="text-muted-foreground w-5">{item.player?.number}</span>
                                  <span>{item.player?.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState 
                        icon={Users} 
                        message={isUpcoming 
                          ? "Lineups will be available before kickoff" 
                          : "No lineup data available for this match"
                        } 
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="odds" className="m-0">
                    {hasOdds ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {details.odds?.slice(0, 3).map((odd, idx) => (
                            <div 
                              key={idx} 
                              className="text-center p-4 rounded-lg bg-muted/20 border border-white/5"
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                {odd.value === "Home" ? match.homeTeam : odd.value === "Away" ? match.awayTeam : "Draw"}
                              </div>
                              <div className="text-xl font-bold text-primary">{odd.odd}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-3">
                          Odds are for informational purposes only
                        </p>
                      </div>
                    ) : (
                      <EmptyState 
                        icon={DollarSign} 
                        message="Odds data not available for this match" 
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="h2h" className="m-0">
                    {hasH2H ? (
                      <div className="space-y-2">
                        {details.h2h?.slice(0, 5).map((h2hMatch, idx) => {
                          const date = h2hMatch.fixture?.date 
                            ? new Date(h2hMatch.fixture.date).toLocaleDateString()
                            : "";
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/20 text-sm"
                            >
                              <span className="text-muted-foreground text-xs w-20">{date}</span>
                              <span className={cn(
                                "flex-1 text-right",
                                h2hMatch.teams?.home?.winner && "text-emerald-400 font-medium"
                              )}>
                                {h2hMatch.teams?.home?.name}
                              </span>
                              <span className="px-3 font-bold">
                                {h2hMatch.goals?.home ?? 0} - {h2hMatch.goals?.away ?? 0}
                              </span>
                              <span className={cn(
                                "flex-1 text-left",
                                h2hMatch.teams?.away?.winner && "text-emerald-400 font-medium"
                              )}>
                                {h2hMatch.teams?.away?.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState 
                        icon={History} 
                        message="No head-to-head data available" 
                      />
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
