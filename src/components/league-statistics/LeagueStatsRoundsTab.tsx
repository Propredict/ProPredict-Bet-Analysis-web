import { RotateCcw, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LeagueStatsRoundsTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsRoundsTab({ leagueId, leagueName }: LeagueStatsRoundsTabProps) {
  // Note: Rounds/matchdays data requires a dedicated API endpoint (e.g., /v3/fixtures/rounds)
  // which is not currently available in the existing edge functions.

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          <span className="font-semibold">{leagueName} Matchdays & Rounds</span>
        </div>
      </Card>

      {/* Data Not Available State */}
      <Card className="p-8 bg-[#0E1627] border-white/10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Info className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Rounds Data Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Matchday/rounds data requires a dedicated API endpoint that is not currently integrated.
              The data would include round numbers, match counts, and status (completed/in progress).
            </p>
          </div>

          {/* Mock Structure */}
          <div className="w-full max-w-md mt-6 opacity-50">
            <div className="text-left text-xs text-muted-foreground mb-2">
              Expected structure:
            </div>
            <div className="space-y-2">
              {[22, 21, 20].map((round) => (
                <div key={round} className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                      {round}
                    </span>
                    <span className="text-sm">Regular Season - {round}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">— / — matches</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-4">
            To enable rounds, integrate the API-Football rounds endpoint in a new edge function.
          </p>
        </div>
      </Card>
    </div>
  );
}
