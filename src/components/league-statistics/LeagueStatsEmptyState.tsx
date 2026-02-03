import { useMemo } from "react";
import { Trophy, Target, Users, Calendar, RotateCcw, Swords } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLiveScores } from "@/hooks/useLiveScores";
import { LeagueSearchSelect } from "./LeagueSearchSelect";

// Known league ID mappings for API-Football
const LEAGUE_ID_MAP: Record<string, string> = {
  "Premier League": "39",
  "La Liga": "140",
  "Bundesliga": "78",
  "Serie A": "135",
  "Ligue 1": "61",
  "Champions League": "2",
  "Europa League": "3",
  "Eredivisie": "88",
  "Primeira Liga": "94",
  "Super Lig": "203",
  "Scottish Premiership": "179",
  "Championship": "40",
  "League One": "41",
  "League Two": "42",
  "FA Cup": "45",
  "EFL Cup": "48",
  "Copa del Rey": "143",
  "DFB Pokal": "81",
  "Coppa Italia": "137",
  "Coupe de France": "66",
  "MLS": "253",
  "A-League": "188",
  "Saudi Pro League": "307",
  "World Cup": "1",
  "Euro Championship": "4",
  "Conference League": "848",
};

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

  // Fetch today's matches to get dynamic leagues
  const { matches } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // Extract unique leagues from today's matches dynamically
  const dynamicLeagues = useMemo(() => {
    const leagueMap = new Map<string, { id: string; name: string; matchCount: number }>();
    
    matches.forEach((match) => {
      const leagueName = match.league;
      if (!leagueName) return;
      
      // Try to find a known league ID, otherwise use the league name as ID
      const leagueId = LEAGUE_ID_MAP[leagueName] || leagueName.toLowerCase().replace(/\s+/g, "-");
      
      if (leagueMap.has(leagueName)) {
        const existing = leagueMap.get(leagueName)!;
        existing.matchCount++;
      } else {
        leagueMap.set(leagueName, { id: leagueId, name: leagueName, matchCount: 1 });
      }
    });

    // Sort by match count (most matches first), then alphabetically
    return Array.from(leagueMap.values()).sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.name.localeCompare(b.name);
    });
  }, [matches]);

  // Combined leagues list: "All Leagues" + dynamic leagues from today
  const allLeagues = useMemo(() => {
    return [{ id: "all", name: "All Leagues", matchCount: matches.length }, ...dynamicLeagues];
  }, [dynamicLeagues, matches.length]);

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
          
          {/* Searchable League Selector */}
          {onSelectLeague && (
            <LeagueSearchSelect
              leagues={allLeagues}
              value=""
              onValueChange={onSelectLeague}
              placeholder="Search leagues..."
              className="w-[220px]"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
