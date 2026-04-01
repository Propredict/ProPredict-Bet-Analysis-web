import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Key WC 2026 national teams with API-Football IDs
const WC_TEAMS = [
  { id: 2384, name: "USA", flag: "🇺🇸" },
  { id: 6, name: "Brazil", flag: "🇧🇷" },
  { id: 26, name: "Argentina", flag: "🇦🇷" },
  { id: 2, name: "France", flag: "🇫🇷" },
  { id: 10, name: "England", flag: "🇬🇧" },
  { id: 25, name: "Germany", flag: "🇩🇪" },
  { id: 9, name: "Spain", flag: "🇪🇸" },
  { id: 27, name: "Portugal", flag: "🇵🇹" },
  { id: 1118, name: "Netherlands", flag: "🇳🇱" },
  { id: 768, name: "Italy", flag: "🇮🇹" },
  { id: 31, name: "Mexico", flag: "🇲🇽" },
  { id: 7, name: "Canada", flag: "🇨🇦" },
];

interface FixtureResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

function getFormResult(teamId: number, fixture: FixtureResult): "W" | "D" | "L" | null {
  if (fixture.homeScore === null || fixture.awayScore === null) return null;
  if (fixture.status !== "finished") return null;

  const isHome = true; // We need team IDs to determine this properly
  // We'll check by team name matching instead
  const homeWon = fixture.homeScore > fixture.awayScore;
  const draw = fixture.homeScore === fixture.awayScore;

  if (draw) return "D";
  return homeWon ? "W" : "L"; // This is a simplified version
}

async function fetchTeamLastMatches(teamId: number): Promise<FixtureResult[]> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/get-fixtures?team=${teamId}&last=5`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return [];
  return res.json();
}

function useNationalTeamForm(teamId: number) {
  return useQuery({
    queryKey: ["wc-team-form", teamId],
    queryFn: () => fetchTeamLastMatches(teamId),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

function TeamFormRow({ team }: { team: typeof WC_TEAMS[0] }) {
  const { data: matches, isLoading } = useNationalTeamForm(team.id);

  const form = (matches || [])
    .filter((m) => m.status === "finished")
    .slice(0, 5)
    .map((m) => {
      if (m.homeScore === null || m.awayScore === null) return null;
      // Determine if this team is home or away by checking team name
      const isHome = m.homeTeam?.toLowerCase().includes(team.name.toLowerCase().slice(0, 4));
      const teamScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      if (teamScore > oppScore) return "W";
      if (teamScore === oppScore) return "D";
      return "L";
    })
    .filter(Boolean) as ("W" | "D" | "L")[];

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{team.flag}</span>
        <span className="text-xs font-semibold text-foreground truncate">
          {team.name}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {isLoading ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-5 rounded" />
            ))}
          </div>
        ) : form.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">No data</span>
        ) : (
          form.map((r, i) => (
            <span
              key={i}
              className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${
                r === "W"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : r === "D"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-destructive/20 text-destructive"
              }`}
            >
              {r}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default function NationalTeamForm() {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">
          Last 5 matches · National teams only
        </span>
      </div>
      <div>
        {WC_TEAMS.map((team) => (
          <TeamFormRow key={team.id} team={team} />
        ))}
      </div>
    </Card>
  );
}
