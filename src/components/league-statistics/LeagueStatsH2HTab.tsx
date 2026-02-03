import { useState, useMemo } from "react";
import { Swords, Calendar, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useH2H, H2HMatch } from "@/hooks/useH2H";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeagueStatsH2HTabProps {
  leagueId: string;
  leagueName: string;
}

interface TeamOption {
  id: number;
  name: string;
}

export function LeagueStatsH2HTab({ leagueId, leagueName }: LeagueStatsH2HTabProps) {
  const [team1Id, setTeam1Id] = useState<number | null>(null);
  const [team2Id, setTeam2Id] = useState<number | null>(null);

  // Fetch today's matches to get teams with IDs
  const { matches, isLoading: matchesLoading } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // Extract unique teams with their IDs from matches
  const teamsInLeague = useMemo(() => {
    const leagueMatches = leagueName
      ? matches.filter((m) => m.league.toLowerCase().includes(leagueName.toLowerCase()))
      : matches;

    const teamMap = new Map<number, string>();
    leagueMatches.forEach((m) => {
      // The Match type from useLiveScores should have team IDs
      // We need to extract them - assuming they're in the match data
      if (m.homeTeamId) teamMap.set(m.homeTeamId, m.homeTeam);
      if (m.awayTeamId) teamMap.set(m.awayTeamId, m.awayTeam);
    });

    return Array.from(teamMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, leagueName]);

  // Fetch H2H data when both teams are selected
  const { data: h2hData, isLoading: h2hLoading, error: h2hError } = useH2H(team1Id, team2Id);

  const team1Options = teamsInLeague.filter((t) => t.id !== team2Id);
  const team2Options = teamsInLeague.filter((t) => t.id !== team1Id);

  const selectedTeam1 = teamsInLeague.find((t) => t.id === team1Id);
  const selectedTeam2 = teamsInLeague.find((t) => t.id === team2Id);

  if (matchesLoading) {
    return (
      <Card className="bg-card border-border p-6">
        <Skeleton className="h-32 w-full bg-white/5" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <span className="font-semibold">Head to Head Comparison</span>
        </div>
      </Card>

      {/* Team Selectors */}
      <Card className="p-3 sm:p-6 bg-card border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          {/* Team 1 */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm text-muted-foreground">Team 1</label>
            <Select
              value={team1Id?.toString() || ""}
              onValueChange={(val) => setTeam1Id(val ? parseInt(val) : null)}
            >
              <SelectTrigger className="bg-card border-border text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Select first team..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[300px]">
                {team1Options.length > 0 ? (
                  team1Options.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()} className="text-xs sm:text-sm">
                      {team.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled className="text-xs sm:text-sm">
                    No teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Team 2 */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm text-muted-foreground">Team 2</label>
            <Select
              value={team2Id?.toString() || ""}
              onValueChange={(val) => setTeam2Id(val ? parseInt(val) : null)}
            >
              <SelectTrigger className="bg-card border-border text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Select second team..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[300px]">
                {team2Options.length > 0 ? (
                  team2Options.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()} className="text-xs sm:text-sm">
                      {team.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled className="text-xs sm:text-sm">
                    No teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* H2H Results */}
      {team1Id && team2Id ? (
        h2hLoading ? (
          <Card className="p-6 bg-card border-border">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          </Card>
        ) : h2hError ? (
          <Card className="p-8 text-center bg-card border-border">
            <p className="text-red-400">Failed to load H2H data. Please try again.</p>
          </Card>
        ) : h2hData ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <Card className="p-6 bg-card border-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  {h2hData.team1.name} vs {h2hData.team2.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {h2hData.summary.totalMatches} matches played
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto">
                <div className="text-center p-2 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xl sm:text-3xl font-bold text-green-400">{h2hData.summary.team1Wins}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-1 truncate">{h2hData.team1.name}</p>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xl sm:text-3xl font-bold text-muted-foreground">{h2hData.summary.draws}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-1">Draws</p>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xl sm:text-3xl font-bold text-red-400">{h2hData.summary.team2Wins}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-1 truncate">{h2hData.team2.name}</p>
                </div>
              </div>
            </Card>

            {/* Match History by Season */}
            {h2hData.seasons.map((seasonData) => (
              <Card key={seasonData.season} className="bg-card border-border overflow-hidden">
                {/* Season Header */}
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Season {seasonData.season}/{seasonData.season + 1}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {seasonData.matches.length} match{seasonData.matches.length !== 1 ? "es" : ""}
                  </span>
                </div>

                {/* Matches */}
                <div className="divide-y divide-white/5">
                  {seasonData.matches.map((match) => (
                    <H2HMatchRow key={match.fixture.id} match={match} />
                  ))}
                </div>
              </Card>
            ))}

            {h2hData.seasons.length === 0 && (
              <Card className="p-8 text-center bg-card border-border">
                <p className="text-muted-foreground">No historical matches found between these teams.</p>
              </Card>
            )}
          </div>
        ) : null
      ) : (
        <Card className="p-8 text-center bg-card border-border">
          <Swords className="h-12 w-12 text-primary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Select Two Teams to Compare</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Choose two teams above to view their complete head-to-head history
          </p>
          {teamsInLeague.length === 0 && (
            <p className="text-xs text-muted-foreground/50 mt-4">
              No teams found for {leagueName || "this league"} today. Try selecting a different league.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

// Match row component
function H2HMatchRow({ match }: { match: H2HMatch }) {
  const homeGoals = match.goals.home ?? 0;
  const awayGoals = match.goals.away ?? 0;
  const matchDate = new Date(match.fixture.date);

  return (
    <div className="px-2 sm:px-4 py-2 sm:py-3 hover:bg-white/5 transition-colors">
      {/* Responsive Flex Layout */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Date - Compact */}
        <div className="flex-shrink-0 w-14 sm:w-20 text-[9px] sm:text-xs text-muted-foreground">
          {format(matchDate, "dd MMM")}
        </div>

        {/* Teams & Score - Flexible */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          {/* Home Team */}
          <div className="flex items-center gap-1 justify-end flex-1 min-w-0">
            <span 
              className={cn(
                "text-[10px] sm:text-xs truncate text-right",
                match.teams.home.winner && "font-semibold text-green-400"
              )}
              title={match.teams.home.name}
            >
              {match.teams.home.name}
            </span>
            {match.teams.home.logo && (
              <img src={match.teams.home.logo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
            )}
          </div>

          {/* Score - Centered */}
          <div className="flex-shrink-0 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded bg-primary/10 border border-primary/20 min-w-[44px] sm:min-w-[60px] text-center">
            <span className="font-bold text-[10px] sm:text-sm">
              {homeGoals} - {awayGoals}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {match.teams.away.logo && (
              <img src={match.teams.away.logo} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0" />
            )}
            <span 
              className={cn(
                "text-[10px] sm:text-xs truncate",
                match.teams.away.winner && "font-semibold text-green-400"
              )}
              title={match.teams.away.name}
            >
              {match.teams.away.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
