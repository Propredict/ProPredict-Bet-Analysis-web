import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Star, Trophy, Zap, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import { supabase } from "@/integrations/supabase/client";

type MatchStatus = "live" | "upcoming" | "finished" | "halftime";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  startTime?: string;
  league: string;
  leagueCountry: string;
}

// Mock match data lookup - in production, this would come from the API
const allMatches: Record<string, Match> = {
  "1": { id: "1", homeTeam: "Manchester United", awayTeam: "Liverpool", homeScore: 2, awayScore: 1, status: "live", minute: 67, league: "Premier League", leagueCountry: "England" },
  "2": { id: "2", homeTeam: "Arsenal", awayTeam: "Chelsea", homeScore: 1, awayScore: 1, status: "halftime", league: "Premier League", leagueCountry: "England" },
  "3": { id: "3", homeTeam: "Manchester City", awayTeam: "Tottenham", homeScore: null, awayScore: null, status: "upcoming", startTime: "15:00", league: "Premier League", leagueCountry: "England" },
  "4": { id: "4", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeScore: 3, awayScore: 2, status: "live", minute: 82, league: "La Liga", leagueCountry: "Spain" },
  "5": { id: "5", homeTeam: "Atletico Madrid", awayTeam: "Sevilla", homeScore: 2, awayScore: 0, status: "finished", league: "La Liga", leagueCountry: "Spain" },
  "6": { id: "6", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", homeScore: 1, awayScore: 0, status: "live", minute: 34, league: "Bundesliga", leagueCountry: "Germany" },
  "7": { id: "7", homeTeam: "RB Leipzig", awayTeam: "Bayer Leverkusen", homeScore: null, awayScore: null, status: "upcoming", startTime: "17:30", league: "Bundesliga", leagueCountry: "Germany" },
  "8": { id: "8", homeTeam: "AC Milan", awayTeam: "Inter Milan", homeScore: 0, awayScore: 0, status: "live", minute: 12, league: "Serie A", leagueCountry: "Italy" },
  "9": { id: "9", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 1, awayScore: 2, status: "finished", league: "Serie A", leagueCountry: "Italy" },
  "10": { id: "10", homeTeam: "PSG", awayTeam: "Man City", homeScore: null, awayScore: null, status: "upcoming", startTime: "20:00", league: "Champions League", leagueCountry: "Europe" },
};

export default function MyFavorites() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { favorites, isFavorite, isSaving, toggleFavorite, isLoading } = useFavorites();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get favorite matches from mock data
  const favoriteMatches = Array.from(favorites)
    .map((id) => allMatches[id])
    .filter(Boolean);

  // Group by league
  const groupedMatches = favoriteMatches.reduce((acc, match) => {
    if (!acc[match.league]) acc[match.league] = [];
    acc[match.league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case "live":
        return (
          <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {match.minute}'
          </Badge>
        );
      case "halftime":
        return (
          <Badge variant="secondary" className="bg-accent/20 text-accent">
            HT
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            FT
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground">
            {match.startTime}
          </Badge>
        );
    }
  };

  if (isAuthenticated === null || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Favorites</h1>
              <p className="text-sm text-muted-foreground">Your saved matches</p>
            </div>
          </div>

          <Card className="p-12 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Login Required</p>
                <p className="text-sm text-muted-foreground">Please log in to view your favorite matches</p>
              </div>
            </div>
          </Card>
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
            <h1 className="text-xl font-semibold text-foreground">My Favorites</h1>
            <p className="text-sm text-muted-foreground">
              {favoriteMatches.length} saved {favoriteMatches.length === 1 ? "match" : "matches"}
            </p>
          </div>
        </div>

        {/* Favorites List */}
        {Object.keys(groupedMatches).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedMatches).map(([league, matches]) => (
              <Card key={league} className="bg-card border-border overflow-hidden">
                {/* League Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{league}</span>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {matches.length} {matches.length === 1 ? "match" : "matches"}
                  </Badge>
                </div>

                {/* Matches */}
                <div className="divide-y divide-border">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      className={cn(
                        "px-4 py-3 flex items-center gap-4 transition-all cursor-pointer",
                        "hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995]",
                        (match.status === "live" || match.status === "halftime") && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(match.id);
                        }}
                        disabled={isSaving(match.id)}
                        className="shrink-0 p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        {isSaving(match.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        ) : (
                          <Star
                            className={cn(
                              "h-4 w-4 transition-all duration-200",
                              isFavorite(match.id)
                                ? "fill-accent text-accent scale-110"
                                : "text-muted-foreground hover:text-accent hover:scale-110"
                            )}
                          />
                        )}
                      </button>

                      {/* Match Info */}
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                        <div className="text-right">
                          <span className="font-medium text-foreground truncate block">
                            {match.homeTeam}
                          </span>
                        </div>

                        <div className="flex flex-col items-center px-3">
                          {match.status === "upcoming" ? (
                            <span className="text-sm text-muted-foreground">
                              {match.startTime}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" || match.status === "halftime"
                                  ? "text-primary"
                                  : "text-foreground"
                              )}>
                                {match.homeScore}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span className={cn(
                                "text-lg font-bold",
                                match.status === "live" || match.status === "halftime"
                                  ? "text-primary"
                                  : "text-foreground"
                              )}>
                                {match.awayScore}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-left">
                          <span className="font-medium text-foreground truncate block">
                            {match.awayTeam}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {getStatusBadge(match)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="p-12 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">No favorite matches yet</p>
                <p className="text-sm text-muted-foreground">
                  Star matches from Live Scores to save them here
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Match Detail Modal */}
        <MatchDetailModal 
          match={selectedMatch} 
          onClose={() => setSelectedMatch(null)} 
        />
      </div>
    </DashboardLayout>
  );
}
