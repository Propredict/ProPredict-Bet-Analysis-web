import { useEffect, useCallback } from "react";
import { X, BarChart3, Users, DollarSign, History, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MatchStatus = "live" | "upcoming" | "finished" | "halftime";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  startTime?: string;
  league: string;
  leagueCountry: string;
}

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

// Mock data availability
const getDataAvailability = (match: Match) => ({
  statistics: match.status !== "upcoming",
  lineups: true,
  odds: true,
  h2h: true,
});

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
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

  if (!match) return null;

  const dataAvailability = getDataAvailability(match);

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            LIVE {match.minute}'
          </Badge>
        );
      case "halftime":
        return (
          <Badge variant="secondary" className="bg-accent/20 text-accent">
            Half Time
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            Full Time
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

  const TabTriggerWithTooltip = ({
    value,
    icon: Icon,
    label,
    disabled,
  }: {
    value: string;
    icon: React.ElementType;
    label: string;
    disabled: boolean;
  }) => {
    const trigger = (
      <TabsTrigger
        value={value}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {disabled ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{label}</span>
      </TabsTrigger>
    );

    if (disabled) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>
            <p>{label} not available for this match</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return trigger;
  };

  return (
    <TooltipProvider>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
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
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Match Info */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between gap-4">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {match.homeTeam.charAt(0)}
                </div>
                <h3 className="font-semibold text-foreground">{match.homeTeam}</h3>
                <p className="text-xs text-muted-foreground mt-1">Home</p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center px-6">
                {match.status === "upcoming" ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-muted-foreground">VS</p>
                    <p className="text-sm text-muted-foreground mt-2">{match.startTime}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "text-4xl font-bold",
                        match.status === "live" || match.status === "halftime"
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      {match.homeScore}
                    </span>
                    <span className="text-2xl text-muted-foreground">:</span>
                    <span
                      className={cn(
                        "text-4xl font-bold",
                        match.status === "live" || match.status === "halftime"
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      {match.awayScore}
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {match.awayTeam.charAt(0)}
                </div>
                <h3 className="font-semibold text-foreground">{match.awayTeam}</h3>
                <p className="text-xs text-muted-foreground mt-1">Away</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={dataAvailability.statistics ? "statistics" : "lineups"} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
              <div className="flex gap-1 p-2">
                <TabTriggerWithTooltip
                  value="statistics"
                  icon={BarChart3}
                  label="Statistics"
                  disabled={!dataAvailability.statistics}
                />
                <TabTriggerWithTooltip
                  value="lineups"
                  icon={Users}
                  label="Lineups"
                  disabled={!dataAvailability.lineups}
                />
                <TabTriggerWithTooltip
                  value="odds"
                  icon={DollarSign}
                  label="Odds"
                  disabled={!dataAvailability.odds}
                />
                <TabTriggerWithTooltip
                  value="h2h"
                  icon={History}
                  label="H2H"
                  disabled={!dataAvailability.h2h}
                />
              </div>
            </TabsList>

            <div className="p-4 max-h-[300px] overflow-y-auto">
              <TabsContent value="statistics" className="mt-0 space-y-4">
                <StatBar label="Possession" home={58} away={42} />
                <StatBar label="Shots" home={12} away={8} />
                <StatBar label="Shots on Target" home={5} away={3} />
                <StatBar label="Corners" home={6} away={4} />
                <StatBar label="Fouls" home={9} away={12} />
              </TabsContent>

              <TabsContent value="lineups" className="mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-3">{match.homeTeam}</h4>
                    <div className="space-y-2">
                      {["GK: Smith", "DF: Jones", "DF: Brown", "MF: Wilson", "FW: Taylor"].map((player) => (
                        <div key={player} className="text-sm text-muted-foreground py-1 px-2 rounded bg-muted/30">
                          {player}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-3">{match.awayTeam}</h4>
                    <div className="space-y-2">
                      {["GK: Garcia", "DF: Martinez", "DF: Lopez", "MF: Rodriguez", "FW: Hernandez"].map((player) => (
                        <div key={player} className="text-sm text-muted-foreground py-1 px-2 rounded bg-muted/30">
                          {player}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="odds" className="mt-0">
                <div className="grid grid-cols-3 gap-3">
                  <OddsCard label="Home Win" odds="2.10" />
                  <OddsCard label="Draw" odds="3.40" />
                  <OddsCard label="Away Win" odds="3.25" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <OddsCard label="Over 2.5" odds="1.85" />
                  <OddsCard label="Under 2.5" odds="1.95" />
                </div>
              </TabsContent>

              <TabsContent value="h2h" className="mt-0 space-y-3">
                <H2HMatch home={match.homeTeam} away={match.awayTeam} homeScore={2} awayScore={1} date="Oct 15, 2024" />
                <H2HMatch home={match.awayTeam} away={match.homeTeam} homeScore={1} awayScore={1} date="Mar 22, 2024" />
                <H2HMatch home={match.homeTeam} away={match.awayTeam} homeScore={3} awayScore={0} date="Sep 10, 2023" />
                <H2HMatch home={match.awayTeam} away={match.homeTeam} homeScore={2} awayScore={2} date="Feb 05, 2023" />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away;
  const homePercent = (home / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{home}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{away}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
        <div
          className="bg-primary transition-all duration-500"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="bg-accent transition-all duration-500"
          style={{ width: `${100 - homePercent}%` }}
        />
      </div>
    </div>
  );
}

function OddsCard({ label, odds }: { label: string; odds: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{odds}</p>
    </div>
  );
}

function H2HMatch({
  home,
  away,
  homeScore,
  awayScore,
  date,
}: {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  date: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground w-24">{date}</span>
      <div className="flex-1 flex items-center justify-center gap-2 text-sm">
        <span className="text-foreground truncate max-w-[100px]">{home}</span>
        <span className="font-bold text-primary">{homeScore} - {awayScore}</span>
        <span className="text-foreground truncate max-w-[100px]">{away}</span>
      </div>
    </div>
  );
}
