import { Trophy, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeagueStatsStandingsTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsStandingsTab({ leagueId, leagueName }: LeagueStatsStandingsTabProps) {
  // Note: Standings data requires a dedicated API endpoint (e.g., /v3/standings)
  // which is not currently available in the existing edge functions.

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="font-semibold">{leagueName} Standings</span>
        </div>
      </Card>

      {/* Data Not Available State */}
      <Card className="p-8 bg-[#0E1627] border-white/10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Info className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Standings Data Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              League standings require a dedicated API endpoint that is not currently integrated.
              The data would include team positions, points, wins, draws, losses, and goal difference.
            </p>
          </div>

          {/* Mock Table Structure (Visual Reference) */}
          <div className="w-full max-w-2xl mt-6 opacity-50">
            <div className="text-left text-xs text-muted-foreground mb-2">
              Expected table structure:
            </div>
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <div className="grid grid-cols-9 gap-2 px-4 py-2 bg-white/5 text-xs font-semibold text-muted-foreground">
                <span>#</span>
                <span className="col-span-2">Team</span>
                <span className="text-center">P</span>
                <span className="text-center">W</span>
                <span className="text-center">D</span>
                <span className="text-center">L</span>
                <span className="text-center">GD</span>
                <span className="text-center">Pts</span>
              </div>
              {[1, 2, 3].map((pos) => (
                <div key={pos} className="grid grid-cols-9 gap-2 px-4 py-3 border-t border-white/5 text-sm">
                  <span className={cn(
                    "font-medium",
                    pos <= 4 && "text-green-400"
                  )}>{pos}</span>
                  <span className="col-span-2 text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center text-orange-400">—</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-4">
            To enable standings, integrate the API-Football standings endpoint in a new edge function.
          </p>
        </div>
      </Card>
    </div>
  );
}
