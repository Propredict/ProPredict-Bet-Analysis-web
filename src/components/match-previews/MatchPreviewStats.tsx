import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Swords, 
  Calendar, 
  Users, 
  Target,
  BarChart3,
  Trophy
} from "lucide-react";
import { useMatchDetails, type MatchDetails, type H2HMatch } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewStatsProps {
  match: Match;
}

export function MatchPreviewStats({ match }: MatchPreviewStatsProps) {
  const { data, loading, error } = useMatchDetails(match.id);
  const [activeTab, setActiveTab] = useState("h2h");

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Match statistics not available</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Match Data & Statistics</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-3 pt-3">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="h2h" className="text-xs gap-1">
              <Swords className="h-3 w-3" />
              <span className="hidden sm:inline">H2H</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="lineups" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              <span className="hidden sm:inline">Lineups</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-3">
          <TabsContent value="h2h" className="mt-0">
            <H2HSection data={data} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <StatsSection data={data} />
          </TabsContent>

          <TabsContent value="lineups" className="mt-0">
            <LineupsSection data={data} />
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <EventsSection data={data} />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

// H2H Section
function H2HSection({ data }: { data: MatchDetails }) {
  const h2hMatches = data.h2h || [];

  if (h2hMatches.length === 0) {
    return (
      <div className="text-center py-6">
        <Swords className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No head-to-head data available</p>
      </div>
    );
  }

  // Calculate H2H summary
  const homeTeamId = data.teams.home.id;
  const awayTeamId = data.teams.away.id;
  
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  h2hMatches.forEach((m) => {
    const homeGoals = m.goals.home ?? 0;
    const awayGoals = m.goals.away ?? 0;
    const isHomeTeamHome = m.teams.home.id === homeTeamId;
    
    if (homeGoals === awayGoals) {
      draws++;
    } else if (homeGoals > awayGoals) {
      if (isHomeTeamHome) homeWins++;
      else awayWins++;
    } else {
      if (isHomeTeamHome) awayWins++;
      else homeWins++;
    }
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xl font-bold text-emerald-400">{homeWins}</p>
          <p className="text-[10px] text-muted-foreground truncate">{data.teams.home.name}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xl font-bold text-muted-foreground">{draws}</p>
          <p className="text-[10px] text-muted-foreground">Draws</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xl font-bold text-red-400">{awayWins}</p>
          <p className="text-[10px] text-muted-foreground truncate">{data.teams.away.name}</p>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground mb-2">Recent Meetings</p>
        {h2hMatches.slice(0, 5).map((match, idx) => (
          <H2HMatchRow key={idx} match={match} />
        ))}
      </div>
    </div>
  );
}

function H2HMatchRow({ match }: { match: H2HMatch }) {
  const homeGoals = match.goals.home ?? 0;
  const awayGoals = match.goals.away ?? 0;
  const matchDate = new Date(match.fixture.date);

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-muted/20 hover:bg-muted/30 transition-colors">
      <span className="text-[10px] text-muted-foreground w-14 shrink-0">
        {format(matchDate, "dd MMM yy")}
      </span>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className={cn(
          "text-xs truncate flex-1 text-right",
          match.teams.home.winner && "text-emerald-400 font-medium"
        )}>
          {match.teams.home.name}
        </span>
        <span className="px-2 py-0.5 mx-2 rounded bg-primary/10 border border-primary/20 text-xs font-bold shrink-0">
          {homeGoals} - {awayGoals}
        </span>
        <span className={cn(
          "text-xs truncate flex-1",
          match.teams.away.winner && "text-emerald-400 font-medium"
        )}>
          {match.teams.away.name}
        </span>
      </div>
    </div>
  );
}

// Stats Section
function StatsSection({ data }: { data: MatchDetails }) {
  const stats = data.statistics || [];

  if (stats.length === 0) {
    return (
      <div className="text-center py-6">
        <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Statistics not yet available</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Stats appear after match starts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Team Headers */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {data.teams.home.logo && (
            <img src={data.teams.home.logo} alt="" className="h-5 w-5 object-contain" />
          )}
          <span className="text-xs font-medium truncate max-w-[80px]">{data.teams.home.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate max-w-[80px]">{data.teams.away.name}</span>
          {data.teams.away.logo && (
            <img src={data.teams.away.logo} alt="" className="h-5 w-5 object-contain" />
          )}
        </div>
      </div>

      {stats.slice(0, 10).map((stat, idx) => (
        <StatRow key={idx} stat={stat} />
      ))}
    </div>
  );
}

function StatRow({ stat }: { stat: { type: string; home: string | number | null; away: string | number | null } }) {
  const homeVal = typeof stat.home === "string" ? parseInt(stat.home) || 0 : (stat.home ?? 0);
  const awayVal = typeof stat.away === "string" ? parseInt(stat.away) || 0 : (stat.away ?? 0);
  const total = homeVal + awayVal || 1;
  const homePercent = (homeVal / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{stat.home ?? 0}</span>
        <span className="text-muted-foreground">{stat.type}</span>
        <span className="font-medium">{stat.away ?? 0}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden flex">
        <div 
          className="bg-primary h-full transition-all" 
          style={{ width: `${homePercent}%` }} 
        />
        <div 
          className="bg-muted-foreground/50 h-full transition-all" 
          style={{ width: `${100 - homePercent}%` }} 
        />
      </div>
    </div>
  );
}

// Lineups Section
function LineupsSection({ data }: { data: MatchDetails }) {
  const lineups = data.lineups || [];

  if (lineups.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Lineups not yet announced</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Usually available 1 hour before kickoff</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {lineups.map((lineup, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {lineup.team.logo && (
              <img src={lineup.team.logo} alt="" className="h-4 w-4 object-contain" />
            )}
            <span className="text-xs font-medium truncate">{lineup.team.name}</span>
            {lineup.formation && (
              <Badge variant="outline" className="text-[9px] ml-auto">{lineup.formation}</Badge>
            )}
          </div>
          <div className="space-y-0.5">
            {lineup.startXI.slice(0, 11).map((player, pIdx) => (
              <div key={pIdx} className="flex items-center gap-1 text-[10px]">
                <span className="w-4 text-muted-foreground">{player.number}</span>
                <span className="truncate">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Events Section
function EventsSection({ data }: { data: MatchDetails }) {
  const events = data.events || [];

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <Target className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No match events yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Events appear during the match</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <span className="text-xs font-bold text-primary w-6">{event.time.elapsed}'</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium truncate">{event.player.name}</span>
              <Badge variant="outline" className="text-[9px]">{event.type}</Badge>
            </div>
            {event.assist.name && (
              <p className="text-[10px] text-muted-foreground truncate">
                Assist: {event.assist.name}
              </p>
            )}
          </div>
          {event.team.logo && (
            <img src={event.team.logo} alt="" className="h-4 w-4 object-contain shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
