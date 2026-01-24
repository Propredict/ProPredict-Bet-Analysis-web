import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIPredictionLeagues } from "@/hooks/useAIPredictionLeagues";

interface AIPredictionsSidebarProps {
  selectedDay: "today" | "tomorrow";
  onDayChange: (day: "today" | "tomorrow") => void;
  selectedLeague: string | null;
  onLeagueChange: (league: string | null) => void;
}

export function AIPredictionsSidebar({
  selectedDay,
  onDayChange,
  selectedLeague,
  onLeagueChange,
}: AIPredictionsSidebarProps) {
  const [leagueSearch, setLeagueSearch] = useState("");
  const [todayOpen, setTodayOpen] = useState(true);
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const { leagues, loading: leaguesLoading } = useAIPredictionLeagues();

  // Filter leagues by search
  const filteredLeagues = leagues.filter((l) =>
    l.league.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Predictions Section */}
      <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Predictions</h3>
          
          {/* Today */}
          <Collapsible open={todayOpen} onOpenChange={setTodayOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between text-sm px-3 py-2 h-auto mb-1",
                  selectedDay === "today"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-[#1e3a5f]/30"
                )}
                onClick={() => onDayChange("today")}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Predictions for Today
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", todayOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Could expand with sub-options if needed */}
            </CollapsibleContent>
          </Collapsible>

          {/* Tomorrow */}
          <Collapsible open={tomorrowOpen} onOpenChange={setTomorrowOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between text-sm px-3 py-2 h-auto",
                  selectedDay === "tomorrow"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-[#1e3a5f]/30"
                )}
                onClick={() => onDayChange("tomorrow")}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Predictions for Tomorrow
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", tomorrowOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Could expand with sub-options if needed */}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Top Leagues Section */}
      <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Leagues</h3>
          
          {/* League List */}
          <div className="space-y-1 mb-4 max-h-[300px] overflow-y-auto">
            {/* All Leagues Option */}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sm px-3 py-2 h-auto",
                selectedLeague === null
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-[#1e3a5f]/30"
              )}
              onClick={() => onLeagueChange(null)}
            >
              <Trophy className="w-4 h-4 mr-2" />
              All Leagues
            </Button>

            {leaguesLoading ? (
              <div className="text-xs text-muted-foreground text-center py-2">Loading...</div>
            ) : (
              filteredLeagues.map((league) => (
                <Button
                  key={league.league}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sm px-3 py-2 h-auto",
                    selectedLeague === league.league
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-[#1e3a5f]/30"
                  )}
                  onClick={() => onLeagueChange(league.league)}
                >
                  <span className="w-5 h-4 flex items-center justify-center mr-2 text-[10px] text-muted-foreground">
                    🏆
                  </span>
                  <span className="truncate flex-1 text-left">{league.league}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({league.matches_count})
                  </span>
                </Button>
              ))
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Country or league"
              value={leagueSearch}
              onChange={(e) => setLeagueSearch(e.target.value)}
              className="pl-10 bg-[#0a1628]/60 border-[#1e3a5f]/50 text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIPredictionsSidebar;
