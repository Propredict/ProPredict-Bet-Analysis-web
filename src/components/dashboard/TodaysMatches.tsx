import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Loader2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLiveScores } from "@/hooks/useLiveScores";
import { cn } from "@/lib/utils";

export function TodaysMatches() {
  const navigate = useNavigate();
  const { matches, isLoading, error } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // Show only first 3 matches, prioritizing live ones
  const sortedMatches = [...matches].sort((a, b) => {
    const statusOrder = { live: 0, halftime: 1, upcoming: 2, finished: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  const displayedMatches = sortedMatches.slice(0, 3);
  const liveCount = matches.filter(m => m.status === "live" || m.status === "halftime").length;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Today's Matches</h2>
          {liveCount > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-1.5 animate-pulse">
              {liveCount} LIVE
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary hover:bg-primary/10"
          onClick={() => navigate("/live-scores")}
        >
          View All
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>

      {/* Matches List */}
      <Card className="bg-card/50 border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : error || displayedMatches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Clock className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No matches available today</p>
            <Button
              variant="link"
              size="sm"
              className="text-primary text-xs h-auto p-0"
              onClick={() => navigate("/live-scores")}
            >
              Check live scores page
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {displayedMatches.map((match) => {
              const isLive = match.status === "live" || match.status === "halftime";
              const isFinished = match.status === "finished";

              return (
                <div
                  key={match.id}
                  onClick={() => navigate("/live-scores")}
                  className="px-3 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {/* Status */}
                    <div className="flex-shrink-0 w-10 text-center">
                      {isLive && (
                        <Badge className="bg-destructive/15 text-destructive border-0 text-[10px] px-1.5 animate-pulse">
                          {match.minute}'
                        </Badge>
                      )}
                      {isFinished && (
                        <span className="text-[10px] font-medium text-muted-foreground">FT</span>
                      )}
                      {match.status === "upcoming" && (
                        <span className="text-[10px] text-muted-foreground">{match.startTime}</span>
                      )}
                    </div>

                    {/* Teams & Score */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      {/* Home Team */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                        <span className="text-xs truncate text-right">{match.homeTeam}</span>
                        {match.homeLogo && (
                          <img src={match.homeLogo} alt="" className="h-4 w-4 object-contain flex-shrink-0" />
                        )}
                      </div>

                      {/* Score */}
                      <div className={cn(
                        "px-2 py-0.5 rounded min-w-[40px] text-center flex-shrink-0",
                        isLive && "bg-destructive/10 border border-destructive/30",
                        isFinished && "bg-primary/10 border border-primary/20",
                        match.status === "upcoming" && "bg-secondary border border-border"
                      )}>
                        <span className={cn(
                          "font-bold text-[11px]",
                          isLive && "text-destructive"
                        )}>
                          {match.status === "upcoming" ? (
                            <span className="text-muted-foreground text-[10px]">vs</span>
                          ) : (
                            <>{match.homeScore ?? 0} - {match.awayScore ?? 0}</>
                          )}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {match.awayLogo && (
                          <img src={match.awayLogo} alt="" className="h-4 w-4 object-contain flex-shrink-0" />
                        )}
                        <span className="text-xs truncate">{match.awayTeam}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* See More CTA */}
        {displayedMatches.length > 0 && (
          <div className="p-3 border-t border-border/30 bg-background/50">
            <Button
              variant="ghost"
              className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/30 group transition-all duration-300 hover:shadow-[0_0_20px_rgba(15,155,142,0.4)] animate-[pulse_3s_ease-in-out_infinite]"
              onClick={() => navigate("/live-scores")}
            >
              <Zap className="h-4 w-4 mr-1.5 text-primary" />
              <span className="text-xs text-primary">Watch live score results</span>
              <ChevronRight className="h-4 w-4 ml-1 text-primary transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
