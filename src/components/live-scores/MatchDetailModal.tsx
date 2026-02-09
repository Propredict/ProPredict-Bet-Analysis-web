import { useEffect, useCallback, useState } from "react";
import { X, BarChart3, Users, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match } from "@/hooks/useLiveScores";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { StatisticsTab } from "./tabs/StatisticsTab";
import { LineupsTab } from "./tabs/LineupsTab";
import { OddsTab } from "./tabs/OddsTab";
import { H2HTab } from "./tabs/H2HTab";

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");

  // Use the new hook for fetching match details
  const { data: details, loading } = useMatchDetails(match?.id ?? null);

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

  const isLiveOrHT = match.status === "live" || match.status === "halftime";
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

  // Get team logos from details if available
  const homeLogo = details?.teams?.home?.logo;
  const awayLogo = details?.teams?.away?.logo;

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-3 py-3 border-b border-white/10">
              <TabsList className="w-full grid grid-cols-4 gap-2 bg-secondary/50 p-1.5 rounded-lg border border-border">
                <TabsTrigger 
                  value="statistics" 
                  className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" /> Stats
                </TabsTrigger>
                <TabsTrigger 
                  value="lineups" 
                  className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Users className="h-3.5 w-3.5 mr-1" /> Lineups
                </TabsTrigger>
                <TabsTrigger 
                  value="odds" 
                  className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Probabilities
                </TabsTrigger>
                <TabsTrigger 
                  value="h2h" 
                  className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <History className="h-3.5 w-3.5 mr-1" /> H2H
                </TabsTrigger>
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

            <TabsContent value="lineups" className="m-0">
              <LineupsTab
                lineups={details?.lineups ?? []}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="odds" className="m-0">
              <OddsTab
                odds={details?.odds ?? []}
                loading={loading}
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
        </div>
      </div>
    </>
  );
}
