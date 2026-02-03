import { useState, useMemo, forwardRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Swords, 
  Users, 
  Target,
  BarChart3,
  Trophy,
  Handshake
} from "lucide-react";
import { useMatchDetails, type MatchDetails, type H2HMatch } from "@/hooks/useMatchDetails";
import { useH2H } from "@/hooks/useH2H";
import { useLeagueScorers, useLeagueAssists, type PlayerStats } from "@/hooks/useLeagueStats";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Match } from "@/hooks/useFixtures";

// League name to API ID mapping
const LEAGUE_ID_MAP: Record<string, string> = {
  "premier league": "39",
  "la liga": "140",
  "bundesliga": "78",
  "serie a": "135",
  "ligue 1": "61",
  "champions league": "2",
  "europa league": "3",
  "eredivisie": "88",
  "primeira liga": "94",
  "jupiler pro league": "144",
};

interface MatchPreviewStatsProps {
  match: Match;
}

export function MatchPreviewStats({ match }: MatchPreviewStatsProps) {
  const { data, loading: detailsLoading } = useMatchDetails(match.id);
  const { data: h2hData, isLoading: h2hLoading } = useH2H(
    match.homeTeamId ?? null,
    match.awayTeamId ?? null
  );
  const [activeTab, setActiveTab] = useState("h2h");

  // Get league ID for scorers/assists data
  const leagueId = useMemo(() => {
    const leagueLower = match.league?.toLowerCase() || "";
    for (const [name, id] of Object.entries(LEAGUE_ID_MAP)) {
      if (leagueLower.includes(name)) return id;
    }
    return null;
  }, [match.league]);

  // Fetch scorers and assists for the league
  const { data: scorersData, isLoading: scorersLoading } = useLeagueScorers(leagueId || "", "2025");
  const { data: assistsData, isLoading: assistsLoading } = useLeagueAssists(leagueId || "", "2025");

  const loading = detailsLoading || h2hLoading;

  // Merge H2H data from both sources - prefer dedicated H2H hook
  const mergedH2H = useMemo(() => {
    if (h2hData?.seasons) {
      // Flatten all matches from H2H hook
      return h2hData.seasons.flatMap(season => 
        season.matches.map(m => ({
          fixture: {
            id: m.fixture.id,
            date: m.fixture.date,
            venue: null
          },
          league: {
            name: m.league.name,
            country: "",
            logo: ""
          },
          teams: m.teams,
          goals: m.goals
        }))
      );
    }
    return data?.h2h || [];
  }, [h2hData, data?.h2h]);

  // Get H2H summary from hook or calculate from match details
  const h2hSummary = useMemo(() => {
    if (h2hData?.summary) {
      return {
        team1Wins: h2hData.summary.team1Wins,
        draws: h2hData.summary.draws,
        team2Wins: h2hData.summary.team2Wins,
        totalMatches: h2hData.summary.totalMatches
      };
    }
    // Calculate from match details H2H
    const h2hMatches = data?.h2h || [];
    const homeTeamId = match.homeTeamId;
    let homeWins = 0, awayWins = 0, draws = 0;
    
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

    return {
      team1Wins: homeWins,
      draws,
      team2Wins: awayWins,
      totalMatches: h2hMatches.length
    };
  }, [h2hData, data?.h2h, match.homeTeamId]);

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
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
        <div className="px-3 pt-3 overflow-x-auto">
          <TabsList className="w-full grid grid-cols-6 h-9 min-w-[400px]">
            <TabsTrigger value="h2h" className="text-xs gap-1">
              <Swords className="h-3 w-3" />
              <span className="hidden sm:inline">H2H</span>
            </TabsTrigger>
            <TabsTrigger value="scorers" className="text-xs gap-1">
              <Trophy className="h-3 w-3" />
              <span className="hidden sm:inline">Scorers</span>
            </TabsTrigger>
            <TabsTrigger value="assists" className="text-xs gap-1">
              <Handshake className="h-3 w-3" />
              <span className="hidden sm:inline">Assists</span>
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
            <H2HSection 
              h2hMatches={mergedH2H} 
              summary={h2hSummary}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
            />
          </TabsContent>

          <TabsContent value="scorers" className="mt-0">
            <ScorersSection 
              scorersData={scorersData} 
              isLoading={scorersLoading}
              leagueId={leagueId}
              leagueName={match.league}
            />
          </TabsContent>

          <TabsContent value="assists" className="mt-0">
            <AssistsSection 
              assistsData={assistsData} 
              isLoading={assistsLoading}
              leagueId={leagueId}
              leagueName={match.league}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <StatsSection data={data} match={match} />
          </TabsContent>

          <TabsContent value="lineups" className="mt-0">
            <LineupsSection data={data} match={match} />
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <EventsSection data={data} />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}

// Empty state component - wrapped with forwardRef for Radix UI compatibility
const EmptyState = forwardRef<HTMLDivElement, { icon: any; title: string; subtitle: string }>(
  ({ icon: Icon, title, subtitle }, ref) => {
    return (
      <div ref={ref} className="text-center py-6">
        <Icon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

// H2H Section with better data handling
interface H2HSectionProps {
  h2hMatches: H2HMatch[];
  summary: { team1Wins: number; draws: number; team2Wins: number; totalMatches: number };
  homeTeam: string;
  awayTeam: string;
}

function H2HSection({ h2hMatches, summary, homeTeam, awayTeam }: H2HSectionProps) {
  if (h2hMatches.length === 0) {
    return (
      <EmptyState 
        icon={Swords} 
        title="No head-to-head history" 
        subtitle="These teams haven't played each other recently"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xl font-bold text-primary">{summary.team1Wins}</p>
          <p className="text-[10px] text-muted-foreground truncate">{homeTeam}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xl font-bold text-muted-foreground">{summary.draws}</p>
          <p className="text-[10px] text-muted-foreground">Draws</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xl font-bold text-destructive">{summary.team2Wins}</p>
          <p className="text-[10px] text-muted-foreground truncate">{awayTeam}</p>
        </div>
      </div>

      {/* Total matches badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-xs">
          {summary.totalMatches} previous {summary.totalMatches === 1 ? 'match' : 'matches'}
        </Badge>
      </div>

      {/* Recent Matches */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground mb-2">Recent Meetings</p>
        {h2hMatches.slice(0, 5).map((match, idx) => (
          <H2HMatchRow key={`${match.fixture.id}-${idx}`} match={match} />
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
          match.teams.home.winner && "text-primary font-medium"
        )}>
          {match.teams.home.name}
        </span>
        <span className="px-2 py-0.5 mx-2 rounded bg-primary/10 border border-primary/20 text-xs font-bold shrink-0">
          {homeGoals} - {awayGoals}
        </span>
        <span className={cn(
          "text-xs truncate flex-1",
          match.teams.away.winner && "text-primary font-medium"
        )}>
          {match.teams.away.name}
        </span>
      </div>
    </div>
  );
}

// Stats Section with fallback
function StatsSection({ data, match }: { data: MatchDetails | null; match: Match }) {
  const stats = data?.statistics || [];

  if (stats.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState 
          icon={BarChart3} 
          title="Statistics not yet available" 
          subtitle="Stats appear during or after the match"
        />
        {/* Show team info as placeholder */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2">
            {match.homeLogo && (
              <img src={match.homeLogo} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="text-sm font-medium">{match.homeTeam}</span>
          </div>
          <span className="text-xs text-muted-foreground">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{match.awayTeam}</span>
            {match.awayLogo && (
              <img src={match.awayLogo} alt="" className="h-6 w-6 object-contain" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Team Headers */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {data?.teams?.home?.logo && (
            <img src={data.teams.home.logo} alt="" className="h-5 w-5 object-contain" />
          )}
          <span className="text-xs font-medium truncate max-w-[80px]">{data?.teams?.home?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate max-w-[80px]">{data?.teams?.away?.name}</span>
          {data?.teams?.away?.logo && (
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

// Lineups Section with fallback
function LineupsSection({ data, match }: { data: MatchDetails | null; match: Match }) {
  const lineups = data?.lineups || [];

  if (lineups.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState 
          icon={Users} 
          title="Lineups not yet announced" 
          subtitle="Usually available 1 hour before kickoff"
        />
        {/* Show team placeholder */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
            {match.homeLogo && (
              <img src={match.homeLogo} alt="" className="h-8 w-8 object-contain mx-auto mb-2" />
            )}
            <p className="text-xs font-medium truncate">{match.homeTeam}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting lineup</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
            {match.awayLogo && (
              <img src={match.awayLogo} alt="" className="h-8 w-8 object-contain mx-auto mb-2" />
            )}
            <p className="text-xs font-medium truncate">{match.awayTeam}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting lineup</p>
          </div>
        </div>
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

// Events Section with fallback
function EventsSection({ data }: { data: MatchDetails | null }) {
  const events = data?.events || [];

  if (events.length === 0) {
    return (
      <EmptyState 
        icon={Target} 
        title="No match events yet" 
        subtitle="Events appear during the match"
      />
    );
  }

  const getEventIcon = (type: string, detail: string) => {
    if (type === "Goal") return "⚽";
    if (type === "Card" && detail.includes("Red")) return "🟥";
    if (type === "Card" && detail.includes("Yellow")) return "🟨";
    if (type === "subst") return "🔄";
    return "•";
  };

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((event, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <span className="text-xs font-bold text-primary w-8 shrink-0">
            {event.time.elapsed}'{event.time.extra ? `+${event.time.extra}` : ''}
          </span>
          <span className="text-sm">{getEventIcon(event.type, event.detail)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium truncate">{event.player.name}</span>
              <span className="text-[10px] text-muted-foreground">({event.detail})</span>
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

// Scorers Section
interface ScorersSectionProps {
  scorersData: any;
  isLoading: boolean;
  leagueId: string | null;
  leagueName: string;
}

function ScorersSection({ scorersData, isLoading, leagueId, leagueName }: ScorersSectionProps) {
  if (!leagueId) {
    return (
      <EmptyState 
        icon={Trophy} 
        title="Scorers not available" 
        subtitle={`Top scorers data not supported for ${leagueName}`}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const players = (scorersData as any)?.players || [];

  if (players.length === 0) {
    return (
      <EmptyState 
        icon={Trophy} 
        title="No scorers data" 
        subtitle="Top scorers will appear here"
      />
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-2 mb-1">
        <span>Player</span>
        <span>Goals</span>
      </div>
      {players.slice(0, 10).map((item: PlayerStats, idx: number) => (
        <div key={item.player.id || idx} className="flex items-center gap-2 p-2 rounded bg-muted/20 hover:bg-muted/30 transition-colors">
          <span className="text-xs font-bold text-primary w-5">{idx + 1}</span>
          <img 
            src={item.player.photo} 
            alt="" 
            className="h-7 w-7 rounded-full object-cover bg-muted"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{item.player.name}</p>
            <div className="flex items-center gap-1">
              {item.team.logo && (
                <img src={item.team.logo} alt="" className="h-3 w-3 object-contain" />
              )}
              <span className="text-[10px] text-muted-foreground truncate">{item.team.name}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">{item.goals}</p>
            <p className="text-[9px] text-muted-foreground">{item.games.appearances} apps</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Assists Section
interface AssistsSectionProps {
  assistsData: any;
  isLoading: boolean;
  leagueId: string | null;
  leagueName: string;
}

function AssistsSection({ assistsData, isLoading, leagueId, leagueName }: AssistsSectionProps) {
  if (!leagueId) {
    return (
      <EmptyState 
        icon={Handshake} 
        title="Assists not available" 
        subtitle={`Top assists data not supported for ${leagueName}`}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const players = (assistsData as any)?.players || [];

  if (players.length === 0) {
    return (
      <EmptyState 
        icon={Handshake} 
        title="No assists data" 
        subtitle="Top assists will appear here"
      />
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-2 mb-1">
        <span>Player</span>
        <span>Assists</span>
      </div>
      {players.slice(0, 10).map((item: PlayerStats, idx: number) => (
        <div key={item.player.id || idx} className="flex items-center gap-2 p-2 rounded bg-muted/20 hover:bg-muted/30 transition-colors">
          <span className="text-xs font-bold text-primary w-5">{idx + 1}</span>
          <img 
            src={item.player.photo} 
            alt="" 
            className="h-7 w-7 rounded-full object-cover bg-muted"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{item.player.name}</p>
            <div className="flex items-center gap-1">
              {item.team.logo && (
                <img src={item.team.logo} alt="" className="h-3 w-3 object-contain" />
              )}
              <span className="text-[10px] text-muted-foreground truncate">{item.team.name}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">{item.assists}</p>
            <p className="text-[9px] text-muted-foreground">{item.games.appearances} apps</p>
          </div>
        </div>
      ))}
    </div>
  );
}