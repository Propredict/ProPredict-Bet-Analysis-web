import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

export function LeagueStatsEmptyState() {
  return (
    <Card className="p-12 text-center bg-[#0E1627] border-white/10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-orange-400/60" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Select a league to view statistics
          </h3>
          <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
            Use the league selector in the top right corner to choose a specific league
            and view detailed standings, top scorers, fixtures, and more.
          </p>
        </div>
      </div>
    </Card>
  );
}
