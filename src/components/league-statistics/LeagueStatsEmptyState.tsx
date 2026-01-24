import { Trophy, Target, Users, Calendar, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LeagueStatsEmptyStateProps {
  type?: "standings" | "scorers" | "assists" | "fixtures" | "rounds" | "h2h" | "default";
}

const typeConfig = {
  standings: {
    icon: Trophy,
    title: "All Leagues Standings",
    subtitle: "Select a league to view standings",
  },
  scorers: {
    icon: Target,
    title: "All Leagues Top Scorers",
    subtitle: "Choose a specific league to view top scorers",
  },
  assists: {
    icon: Users,
    title: "All Leagues Top Assists",
    subtitle: "Choose a specific league to view top assists",
  },
  fixtures: {
    icon: Calendar,
    title: "All Leagues Fixtures & Results",
    subtitle: "Choose a specific league to view fixtures",
  },
  rounds: {
    icon: RotateCcw,
    title: "All Leagues Matchdays & Rounds",
    subtitle: "Choose a specific league to view rounds",
  },
  h2h: {
    icon: Trophy,
    title: "Head to Head",
    subtitle: "Select a league to compare teams",
  },
  default: {
    icon: Trophy,
    title: "Select a League",
    subtitle: "Choose a league to view statistics",
  },
};

export function LeagueStatsEmptyState({ type = "default" }: LeagueStatsEmptyStateProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-semibold">{config.title}</span>
        </div>
      </Card>

      {/* Empty State */}
      <Card className="p-12 text-center bg-[#0E1627] border-white/10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-orange-400/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Select a League
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              {config.subtitle}. Use the league selector in the top right corner to choose a specific league.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
