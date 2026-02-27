import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Trophy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";

export default function MyFavorites() {
  const navigate = useNavigate();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const { matches, isLoading: matchesLoading } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  const { favorites, isFavorite, isSaving, toggleFavorite, isLoading: favoritesLoading } = useFavorites();
  

  // Enable goal/red card alerts on Favorites page
  const { hasRecentGoal } = useLiveAlerts(matches, favorites, undefined, "favorites");

  const favoriteMatches = useMemo(() => matches.filter((m) => favorites.has(m.id)), [matches, favorites]);

  const grouped = useMemo(() => {
    return favoriteMatches.reduce(
      (acc, m) => {
        acc[m.league] ??= [];
        acc[m.league].push(m);
        return acc;
      },
      {} as Record<string, Match[]>,
    );
  }, [favoriteMatches]);

  if (matchesLoading || favoritesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="section-gap animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/20 via-pink-500/10 to-transparent border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
        <div className="p-1.5 rounded-md bg-pink-500/20">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400 fill-pink-400" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-foreground">My Favorites</h1>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{favoriteMatches.length} saved matches</p>
        </div>
      </div>

      {/* FAVORITES */}
      {favoriteMatches.length > 0 ? (
        Object.entries(grouped).map(([league, games]) => (
          <Card key={league} className="card-compact">
            <div className="flex justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-xs sm:text-sm">{league}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{games.length}</Badge>
            </div>

            <div className="divide-y divide-border">
            {games.map((m) => {
              const isLive = m.status === "live" || m.status === "halftime";
              const goalFlash = hasRecentGoal(m.id);
              
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className={cn(
                    "px-3 py-2 flex items-center gap-2 hover:bg-muted/40 cursor-pointer transition-colors",
                    goalFlash && "bg-success/10 border-l-2 border-success"
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m.id, navigate);
                    }}
                    disabled={isSaving(m.id)}
                  >
                    <Star
                      className={cn("h-3.5 w-3.5", isFavorite(m.id) ? "text-accent fill-accent" : "text-muted-foreground")}
                    />
                  </button>

                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center text-xs sm:text-sm">
                    <span className={cn("text-right truncate", goalFlash && "text-success font-semibold")}>{m.homeTeam}</span>
                    <span className="font-bold px-2">
                      {m.status === "upcoming" ? "vs" : (
                        <span className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold",
                          isLive && !goalFlash && "bg-destructive/15 text-destructive border border-destructive/30",
                          isLive && goalFlash && "bg-success/15 text-success border border-success/30",
                          !isLive && "text-foreground"
                        )}>
                          {m.homeScore ?? 0} - {m.awayScore ?? 0}
                        </span>
                      )}
                    </span>
                    <span className={cn("truncate", goalFlash && "text-success font-semibold")}>{m.awayTeam}</span>
                  </div>

                  {m.status === "live" ? (
                    <div className="flex items-center gap-0.5">
                      <Badge className="bg-destructive/15 text-destructive border border-destructive/30 font-bold text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse mr-0.5 sm:mr-1" />
                        {m.minute}'
                      </Badge>
                      <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-[9px] sm:text-[10px]">
                        LIVE
                      </Badge>
                    </div>
                  ) : m.status === "halftime" ? (
                    <Badge className="bg-warning/15 text-warning border border-warning/30 font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5">
                      HT
                    </Badge>
                  ) : m.status === "finished" ? (
                    <Badge className="bg-muted text-muted-foreground border border-border font-semibold text-[9px] sm:text-[10px] px-1.5 py-0.5">
                      FT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {m.startTime}
                    </Badge>
                  )}
                </div>
              );
            })}
            </div>
          </Card>
        ))
      ) : (
        <Card className="card-compact p-8 text-center opacity-70">
          <p className="text-xs sm:text-sm text-muted-foreground">No favorite matches yet</p>
        </Card>
      )}

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}
