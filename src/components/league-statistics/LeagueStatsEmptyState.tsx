import { Trophy, Target, Users, Calendar, RotateCcw, Swords } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEAGUES = [
  { id: "39", name: "Premier League" },
  { id: "140", name: "La Liga" },
  { id: "78", name: "Bundesliga" },
  { id: "135", name: "Serie A" },
  { id: "61", name: "Ligue 1" },
  { id: "2", name: "Champions League" },
  { id: "3", name: "Europa League" },
];

interface LeagueStatsEmptyStateProps {
  type?: "standings" | "scorers" | "assists" | "fixtures" | "rounds" | "h2h" | "default";
  onSelectLeague?: (leagueId: string) => void;
}

const typeConfig = {
  standings: {
    icon: Trophy,
    title: "All Leagues Standings",
    subtitle: "Choose a specific league to view standings",
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
    icon: Swords,
    title: "All Leagues Head to Head",
    subtitle: "Choose a specific league to compare teams",
  },
  default: {
    icon: Trophy,
    title: "Select a League",
    subtitle: "Choose a league to view statistics",
  },
};

export function LeagueStatsEmptyState({ type = "default", onSelectLeague }: LeagueStatsEmptyStateProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header with green bullet */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-semibold text-foreground">{config.title}</span>
      </div>

      {/* Empty State Card */}
      <Card className="p-12 text-center bg-gradient-to-br from-primary/15 via-primary/10 to-card border-primary/20">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary/50" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              Select a League
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {config.subtitle}
            </p>
          </div>
          
          {/* League Selector Dropdown */}
          {onSelectLeague && (
            <Select onValueChange={onSelectLeague}>
              <SelectTrigger className="w-[200px] bg-card border-primary/20">
                <SelectValue placeholder="Select a League" />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20">
                {LEAGUES.map((league) => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>
    </div>
  );
}
