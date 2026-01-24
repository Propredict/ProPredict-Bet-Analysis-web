import { Target, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LeagueStatsScorersTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsScorersTab({ leagueId, leagueName }: LeagueStatsScorersTabProps) {
  // Note: Top scorers data requires a dedicated API endpoint (e.g., /v3/players/topscorers)
  // which is not currently available in the existing edge functions.

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-semibold">{leagueName} Top Scorers</span>
        </div>
      </Card>

      {/* Data Not Available State */}
      <Card className="p-8 bg-[#0E1627] border-white/10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Info className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Top Scorers Data Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Top scorers data requires a dedicated API endpoint that is not currently integrated.
              The data would include player names, teams, goals, assists, and penalty stats.
            </p>
          </div>

          {/* Mock Table Structure */}
          <div className="w-full max-w-2xl mt-6 opacity-50">
            <div className="text-left text-xs text-muted-foreground mb-2">
              Expected table structure:
            </div>
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-white/5 text-xs font-semibold text-muted-foreground">
                <span>#</span>
                <span className="col-span-2">Player</span>
                <span>Team</span>
                <span className="text-center">Games</span>
                <span className="text-center">Goals</span>
                <span className="text-center">Assists</span>
              </div>
              {[1, 2, 3].map((pos) => (
                <div key={pos} className="grid grid-cols-7 gap-2 px-4 py-3 border-t border-white/5 text-sm">
                  <span className="font-medium text-orange-400">{pos}</span>
                  <span className="col-span-2 text-muted-foreground">—</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                  <span className="text-center font-bold text-green-400">—</span>
                  <span className="text-center text-muted-foreground">—</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-4">
            To enable top scorers, integrate the API-Football topscorers endpoint in a new edge function.
          </p>
        </div>
      </Card>
    </div>
  );
}
