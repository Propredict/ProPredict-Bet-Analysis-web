import { Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeagueStatsScorersTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock data
const MOCK_SCORERS = [
  { pos: 1, player: "Mohamed Salah", team: "Liverpool", goals: 18, assists: 13, matches: 21 },
  { pos: 2, player: "Erling Haaland", team: "Man City", goals: 16, assists: 1, matches: 19 },
  { pos: 3, player: "Alexander Isak", team: "Newcastle", goals: 13, assists: 4, matches: 20 },
  { pos: 4, player: "Chris Wood", team: "Nottm Forest", goals: 12, assists: 1, matches: 21 },
  { pos: 5, player: "Cole Palmer", team: "Chelsea", goals: 11, assists: 6, matches: 19 },
  { pos: 6, player: "Bryan Mbeumo", team: "Brentford", goals: 11, assists: 4, matches: 21 },
  { pos: 7, player: "Ollie Watkins", team: "Aston Villa", goals: 9, assists: 5, matches: 20 },
  { pos: 8, player: "Nicolas Jackson", team: "Chelsea", goals: 9, assists: 4, matches: 19 },
  { pos: 9, player: "Bukayo Saka", team: "Arsenal", goals: 8, assists: 9, matches: 18 },
  { pos: 10, player: "Matheus Cunha", team: "Wolves", goals: 8, assists: 3, matches: 20 },
];

export function LeagueStatsScorersTab({ leagueId, leagueName }: LeagueStatsScorersTabProps) {
  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
        <Target className="h-4 w-4 text-orange-400" />
        <span className="font-semibold">{leagueName} Top Scorers</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center w-[60px]">P</TableHead>
              <TableHead className="text-center w-[60px] font-bold">Goals</TableHead>
              <TableHead className="text-center w-[60px]">Assists</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_SCORERS.map((row) => (
              <TableRow key={row.pos} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium text-orange-400">{row.pos}</TableCell>
                <TableCell className="font-medium">{row.player}</TableCell>
                <TableCell className="text-muted-foreground">{row.team}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.matches}</TableCell>
                <TableCell className="text-center font-bold text-green-400">{row.goals}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.assists}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
