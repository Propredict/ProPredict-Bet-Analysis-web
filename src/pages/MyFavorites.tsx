import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Star, Trophy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { useLiveScores, Match } from "@/hooks/useLiveScores";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";

export default function MyFavorites() {
  const navigate = useNavigate();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const { matches, isLoading: matchesLoading } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  const { favorites, isFavorite, isSaving, toggleFavorite, isLoading: favoritesLoading } = useFavorites();

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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Standardized */}
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-accent fill-accent" />
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

              {games.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="px-3 py-2 flex items-center gap-2 hover:bg-muted/40 cursor-pointer"
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
                    <span className="text-right truncate">{m.homeTeam}</span>
                    <span className="font-bold px-2">
                      {m.status === "upcoming" ? "vs" : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                    </span>
                    <span className="truncate">{m.awayTeam}</span>
                  </div>

                  <Badge variant="outline" className="text-[10px]">{m.status === "live" ? "LIVE" : m.startTime}</Badge>
                </div>
              ))}
            </Card>
          ))
        ) : (
          <Card className="card-compact p-8 text-center opacity-70">
            <p className="text-xs sm:text-sm text-muted-foreground">No favorite matches yet</p>
          </Card>
        )}

        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>
    </DashboardLayout>
  );
}
