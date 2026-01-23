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

  // 👇 UČITAVAMO SVE MEČEVE (za danas)
  const { matches, isLoading: matchesLoading } = useLiveScores({
    dateMode: "today",
    statusFilter: "all",
  });

  // 👇 UČITAVAMO FAVORITE ID-JEVE
  const { favorites, isFavorite, isSaving, toggleFavorite, isLoading: favoritesLoading } = useFavorites();

  // 👇 PRAVI FAVORITI (FILTER)
  const favoriteMatches = useMemo(() => matches.filter((m) => favorites.has(m.id)), [matches, favorites]);

  // 👇 GROUP BY LEAGUE
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-accent fill-accent" />
          <div>
            <h1 className="text-xl font-semibold">My Favorites</h1>
            <p className="text-sm text-muted-foreground">{favoriteMatches.length} saved matches</p>
          </div>
        </div>

        {/* FAVORITES */}
        {favoriteMatches.length > 0 ? (
          Object.entries(grouped).map(([league, games]) => (
            <Card key={league}>
              <div className="flex justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{league}</span>
                </div>
                <Badge variant="secondary">{games.length}</Badge>
              </div>

              {games.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40 cursor-pointer"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m.id, navigate);
                    }}
                    disabled={isSaving(m.id)}
                  >
                    <Star
                      className={cn("h-4 w-4", isFavorite(m.id) ? "text-accent fill-accent" : "text-muted-foreground")}
                    />
                  </button>

                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center">
                    <span className="text-right">{m.homeTeam}</span>
                    <span className="font-bold px-3">
                      {m.status === "upcoming" ? "vs" : `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`}
                    </span>
                    <span>{m.awayTeam}</span>
                  </div>

                  <Badge variant="outline">{m.status === "live" ? "LIVE" : m.startTime}</Badge>
                </div>
              ))}
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center opacity-70">No favorite matches yet</Card>
        )}

        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </div>
    </DashboardLayout>
  );
}
