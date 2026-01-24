import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LeagueStatsStandingsTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock data - in production this would come from an API
const MOCK_STANDINGS = [
  { pos: 1, team: "Liverpool", played: 21, won: 14, draw: 6, lost: 1, gf: 52, ga: 20, gd: 32, pts: 48 },
  { pos: 2, team: "Arsenal", played: 21, won: 12, draw: 7, lost: 2, gf: 42, ga: 18, gd: 24, pts: 43 },
  { pos: 3, team: "Nottm Forest", played: 21, won: 12, draw: 5, lost: 4, gf: 35, ga: 21, gd: 14, pts: 41 },
  { pos: 4, team: "Chelsea", played: 21, won: 10, draw: 7, lost: 4, gf: 41, ga: 26, gd: 15, pts: 37 },
  { pos: 5, team: "Newcastle", played: 21, won: 10, draw: 5, lost: 6, gf: 35, ga: 24, gd: 11, pts: 35 },
  { pos: 6, team: "Brighton", played: 21, won: 9, draw: 7, lost: 5, gf: 37, ga: 28, gd: 9, pts: 34 },
  { pos: 7, team: "Bournemouth", played: 21, won: 9, draw: 6, lost: 6, gf: 34, ga: 26, gd: 8, pts: 33 },
  { pos: 8, team: "Aston Villa", played: 21, won: 9, draw: 5, lost: 7, gf: 30, ga: 29, gd: 1, pts: 32 },
  { pos: 9, team: "Fulham", played: 21, won: 8, draw: 6, lost: 7, gf: 32, ga: 29, gd: 3, pts: 30 },
  { pos: 10, team: "Man City", played: 21, won: 8, draw: 5, lost: 8, gf: 38, ga: 30, gd: 8, pts: 29 },
];

export function LeagueStatsStandingsTab({ leagueId, leagueName }: LeagueStatsStandingsTabProps) {
  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-orange-400" />
        <span className="font-semibold">{leagueName} Standings</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center w-[50px]">P</TableHead>
              <TableHead className="text-center w-[50px]">W</TableHead>
              <TableHead className="text-center w-[50px]">D</TableHead>
              <TableHead className="text-center w-[50px]">L</TableHead>
              <TableHead className="text-center w-[50px]">GF</TableHead>
              <TableHead className="text-center w-[50px]">GA</TableHead>
              <TableHead className="text-center w-[50px]">GD</TableHead>
              <TableHead className="text-center w-[60px] font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_STANDINGS.map((row) => (
              <TableRow key={row.pos} className="border-white/5 hover:bg-white/5">
                <TableCell
                  className={cn(
                    "font-medium",
                    row.pos <= 4 && "text-green-400",
                    row.pos === 5 && "text-orange-400",
                    row.pos >= 18 && "text-red-400"
                  )}
                >
                  {row.pos}
                </TableCell>
                <TableCell className="font-medium">{row.team}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.played}</TableCell>
                <TableCell className="text-center text-green-400">{row.won}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.draw}</TableCell>
                <TableCell className="text-center text-red-400">{row.lost}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.gf}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.ga}</TableCell>
                <TableCell
                  className={cn(
                    "text-center",
                    row.gd > 0 ? "text-green-400" : row.gd < 0 ? "text-red-400" : "text-muted-foreground"
                  )}
                >
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </TableCell>
                <TableCell className="text-center font-bold text-orange-400">{row.pts}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
