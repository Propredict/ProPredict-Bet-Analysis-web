import { useState, useMemo } from "react";
import { Swords, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveScores } from "@/hooks/useLiveScores";
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

export function LeagueStatsH2HTab({ leagueId, leagueName }: LeagueStatsH2HTabProps) {
  const [team1, setTeam1] = useState<string>("");
  const [team2, setTeam2] = useState<string>("");

  // Fetch today's matches to get teams from real data
  const { matches, isLoading } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // Filter matches by league and extract unique teams
  const teamsInLeague = useMemo(() => {
    const leagueMatches = leagueName 
      ? matches.filter((m) => m.league.toLowerCase().includes(leagueName.toLowerCase()))
      : matches;
    
    const teamSet = new Set<string>();
    leagueMatches.forEach((m) => {
      teamSet.add(m.homeTeam);
      teamSet.add(m.awayTeam);
    });
    
    return Array.from(teamSet).sort();
  }, [matches, leagueName]);

  // Filter team options
  const team1Options = teamsInLeague.filter((t) => t !== team2);
  const team2Options = teamsInLeague.filter((t) => t !== team1);

  const showResults = team1 && team2;

  if (isLoading) {
    return (
      <Card className="bg-[#0E1627] border-white/10 p-6">
        <Skeleton className="h-32 w-full bg-white/5" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <span className="font-semibold">Head to Head Comparison</span>
        </div>
      </Card>

      {/* Team Selectors */}
      <Card className="p-6 bg-[#0E1627] border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team 1 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Team 1</label>
            <Select value={team1} onValueChange={setTeam1}>
              <SelectTrigger className="bg-[#0E1627] border-white/10">
                <SelectValue placeholder="Select first team..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0E1627] border-white/10 max-h-[300px]">
                {team1Options.length > 0 ? (
                  team1Options.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Team 2 */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Team 2</label>
            <Select value={team2} onValueChange={setTeam2}>
              <SelectTrigger className="bg-[#0E1627] border-white/10">
                <SelectValue placeholder="Select second team..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0E1627] border-white/10 max-h-[300px]">
                {team2Options.length > 0 ? (
                  team2Options.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results or Empty State */}
      {showResults ? (
        <Card className="p-8 text-center bg-[#0E1627] border-white/10">
          <History className="h-12 w-12 text-primary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {team1} vs {team2}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            View detailed head-to-head history in the match detail modal when these teams play.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">—</p>
              <p className="text-xs text-muted-foreground">{team1} Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Draws</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">—</p>
              <p className="text-xs text-muted-foreground">{team2} Wins</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-6">
            💡 Tip: Click on any match to see full H2H stats in the match detail modal.
          </p>
        </Card>
      ) : (
        <Card className="p-8 text-center bg-[#0E1627] border-white/10">
          <Swords className="h-12 w-12 text-primary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Select Two Teams to Compare</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Choose two teams above to compare head-to-head records
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
