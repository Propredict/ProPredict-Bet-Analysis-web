import { useMemo, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useMatchDetails, type H2HMatch } from "@/hooks/useMatchDetails";
import { useH2H } from "@/hooks/useH2H";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewStatsProps {
  match: Match;
}

export function MatchPreviewStats({ match }: MatchPreviewStatsProps) {
  const { data, loading: detailsLoading } = useMatchDetails(match.id);
  const { data: h2hData, isLoading: h2hLoading } = useH2H(
    match.homeTeamId ?? null,
    match.awayTeamId ?? null
  );

  const loading = detailsLoading || h2hLoading;

  const mergedH2H = useMemo(() => {
    if (h2hData?.seasons) {
      return h2hData.seasons.flatMap(season =>
        season.matches.map(m => ({
          fixture: { id: m.fixture.id, date: m.fixture.date, venue: null },
          league: { name: m.league.name, country: "", logo: "" },
          teams: m.teams,
          goals: m.goals
        }))
      );
    }
    return data?.h2h || [];
  }, [h2hData, data?.h2h]);

  const h2hSummary = useMemo(() => {
    if (h2hData?.summary) {
      return {
        team1Wins: h2hData.summary.team1Wins,
        draws: h2hData.summary.draws,
        team2Wins: h2hData.summary.team2Wins,
        totalMatches: h2hData.summary.totalMatches
      };
    }
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

    return { team1Wins: homeWins, draws, team2Wins: awayWins, totalMatches: h2hMatches.length };
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
          <Swords className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Head to Head</span>
        </div>
      </div>
      <div className="p-3">
        <H2HSection
          h2hMatches={mergedH2H}
          summary={h2hSummary}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
      </div>
    </Card>
  );
}

const EmptyState = forwardRef<HTMLDivElement, { icon: any; title: string; subtitle: string }>(
  ({ icon: Icon, title, subtitle }, ref) => (
    <div ref={ref} className="text-center py-6">
      <Icon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
    </div>
  )
);
EmptyState.displayName = "EmptyState";

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

      <div className="flex justify-center">
        <Badge variant="outline" className="text-xs">
          {summary.totalMatches} previous {summary.totalMatches === 1 ? "match" : "matches"}
        </Badge>
      </div>

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
