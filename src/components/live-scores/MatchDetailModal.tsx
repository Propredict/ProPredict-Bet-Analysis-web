import { useEffect, useCallback, useState } from "react";
import { X, BarChart3, Users, DollarSign, History, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
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

  // Reset to statistics tab when match changes
  useEffect(() => {
    if (match) {
      setActiveTab("statistics");
    }
  }, [match?.id]);

  if (!match) return null;

  const isLiveOrHT = match.status === "live" || match.status === "halftime";
  const isUpcoming = match.status === "upcoming";

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return (
          <Badge className="bg-red-500 text-white animate-pulse gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            LIVE {match.minute}'
          </Badge>
        );
      case "halftime":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            HT
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            FT
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground">
            {match.startTime}
          </Badge>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-2xl pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151923]">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {match.league} • {match.leagueCountry}
              </div>
              {getStatusBadge()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Match Info with Team Logos */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-b from-[#151923] to-transparent">
            <div className="flex items-center justify-between gap-4">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                  {match.homeLogo ? (
                    <img 
                      src={match.homeLogo} 
                      alt={match.homeTeam}
                      className="w-14 h-14 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-muted-foreground">${match.homeTeam.charAt(0)}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {match.homeTeam.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white text-sm sm:text-base">{match.homeTeam}</h3>
                <p className="text-xs text-muted-foreground mt-1">Home</p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center px-4">
                {isUpcoming ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-muted-foreground">VS</p>
                    <p className="text-sm text-muted-foreground mt-2">{match.startTime}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-4xl sm:text-5xl font-bold",
                        isLiveOrHT ? "text-red-400" : "text-white"
                      )}
                    >
                      {match.homeScore ?? 0}
                    </span>
                    <span className="text-2xl text-muted-foreground">:</span>
                    <span
                      className={cn(
                        "text-4xl sm:text-5xl font-bold",
                        isLiveOrHT ? "text-red-400" : "text-white"
                      )}
                    >
                      {match.awayScore ?? 0}
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                  {match.awayLogo ? (
                    <img 
                      src={match.awayLogo} 
                      alt={match.awayTeam}
                      className="w-14 h-14 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-muted-foreground">${match.awayTeam.charAt(0)}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {match.awayTeam.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white text-sm sm:text-base">{match.awayTeam}</h3>
                <p className="text-xs text-muted-foreground mt-1">Away</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 h-auto">
              <div className="flex gap-1 p-2 overflow-x-auto">
                <TabsTrigger
                  value="statistics"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Statistics</span>
                </TabsTrigger>
                <TabsTrigger
                  value="lineups"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Lineups</span>
                </TabsTrigger>
                <TabsTrigger
                  value="odds"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Odds</span>
                </TabsTrigger>
                <TabsTrigger
                  value="h2h"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>H2H</span>
                </TabsTrigger>
              </div>
            </TabsList>

            <div className="p-4 max-h-[300px] overflow-y-auto">
              {/* Statistics Tab */}
              <TabsContent value="statistics" className="mt-0">
                {isUpcoming ? (
                  <EmptyState 
                    icon={BarChart3}
                    title="Statistics not available yet"
                    description="Live statistics will appear once the match starts."
                  />
                ) : (
                  <div className="space-y-4">
                    <EmptyState 
                      icon={BarChart3}
                      title="Statistics unavailable"
                      description="Detailed match statistics are not available for this fixture. Statistics require an extended API subscription."
                    />
                  </div>
                )}
              </TabsContent>

              {/* Lineups Tab */}
              <TabsContent value="lineups" className="mt-0">
                {isUpcoming ? (
                  <EmptyState 
                    icon={Users}
                    title="Lineups will be available before kickoff"
                    description="Team lineups are typically announced 1 hour before the match starts."
                  />
                ) : (
                  <EmptyState 
                    icon={Users}
                    title="Lineups unavailable"
                    description="Lineup data is not available for this match. This may be due to the competition type or data limitations."
                  />
                )}
              </TabsContent>

              {/* Odds Tab */}
              <TabsContent value="odds" className="mt-0">
                <EmptyState 
                  icon={DollarSign}
                  title="Odds data not available"
                  description="Betting odds are not available for this match. Odds require a premium API subscription."
                />
              </TabsContent>

              {/* H2H Tab */}
              <TabsContent value="h2h" className="mt-0">
                <EmptyState 
                  icon={History}
                  title="Head-to-Head data not available"
                  description="Historical match data between these teams is not available for this fixture."
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* Live sync indicator */}
          {isLiveOrHT && (
            <div className="px-4 py-2 border-t border-white/10 bg-[#151923]">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span>Live • Auto-updating every 30s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-white mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-[280px]">{description}</p>
    </div>
  );
}
