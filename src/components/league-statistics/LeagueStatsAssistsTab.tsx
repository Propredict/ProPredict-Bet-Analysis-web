import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeagueStatsAssistsTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock data
const MOCK_ASSISTS = [
  { pos: 1, player: "Mohamed Salah", team: "Liverpool", assists: 13, goals: 18, matches: 21 },
  { pos: 2, player: "Bukayo Saka", team: "Arsenal", assists: 9, goals: 8, matches: 18 },
  { pos: 3, player: "Trent Alexander-Arnold", team: "Liverpool", assists: 8, goals: 2, matches: 19 },
  { pos: 4, player: "Morgan Rogers", team: "Aston Villa", assists: 7, goals: 4, matches: 20 },
  { pos: 5, player: "Cole Palmer", team: "Chelsea", assists: 6, goals: 11, matches: 19 },
  { pos: 6, player: "Bruno Fernandes", team: "Man United", assists: 6, goals: 5, matches: 20 },
  { pos: 7, player: "Noni Madueke", team: "Chelsea", assists: 6, goals: 4, matches: 18 },
  { pos: 8, player: "Ollie Watkins", team: "Aston Villa", assists: 5, goals: 9, matches: 20 },
  { pos: 9, player: "Luis Diaz", team: "Liverpool", assists: 5, goals: 6, matches: 19 },
  { pos: 10, player: "Amad Diallo", team: "Man United", assists: 5, goals: 3, matches: 17 },
];

export function LeagueStatsAssistsTab({ leagueId, leagueName }: LeagueStatsAssistsTabProps) {
  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
        <Users className="h-4 w-4 text-orange-400" />
        <span className="font-semibold">{leagueName} Top Assists</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center w-[60px]">P</TableHead>
              <TableHead className="text-center w-[60px] font-bold">Assists</TableHead>
              <TableHead className="text-center w-[60px]">Goals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_ASSISTS.map((row) => (
              <TableRow key={row.pos} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium text-orange-400">{row.pos}</TableCell>
                <TableCell className="font-medium">{row.player}</TableCell>
                <TableCell className="text-muted-foreground">{row.team}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.matches}</TableCell>
                <TableCell className="text-center font-bold text-purple-400">{row.assists}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.goals}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
