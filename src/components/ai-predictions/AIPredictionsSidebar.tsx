import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [todayOpen, setTodayOpen] = useState(true);
  const [tomorrowOpen, setTomorrowOpen] = useState(true);

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

    </div>
  );
}

export default AIPredictionsSidebar;
