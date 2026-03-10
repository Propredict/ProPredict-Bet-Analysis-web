import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useLeaguePlayers, type PlayersResponse, type DetailedPlayerStats } from "@/hooks/useLeagueStats";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface LeagueStatsPlayersTabProps {
  leagueId: string;
  leagueName: string;
}

type SortKey = "goals" | "assists" | "rating" | "shots" | "passes" | "cards";

function getSortValue(p: DetailedPlayerStats, key: SortKey): number {
  switch (key) {
    case "goals": return p.goals;
    case "assists": return p.assists;
    case "rating": return parseFloat(p.games.rating || "0");
    case "shots": return p.shots.total;
    case "passes": return p.passes.key;
    case "cards": return p.cards.yellow + p.cards.red;
  }
}

function getSortLabel(key: SortKey): string {
  switch (key) {
    case "goals": return "Goals";
    case "assists": return "Assists";
    case "rating": return "Rating";
    case "shots": return "Shots";
    case "passes": return "Key Passes";
    case "cards": return "Cards";
  }
}

export function LeagueStatsPlayersTab({ leagueId, leagueName }: LeagueStatsPlayersTabProps) {
  const { data, isLoading } = useLeaguePlayers(leagueId);
  const [sortKey, setSortKey] = useState<SortKey>("goals");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  const playersData = data as PlayersResponse | null;
  const players = playersData?.players || [];

  if (players.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No player data available for {leagueName}</p>
      </Card>
    );
  }

  const sorted = [...players].sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));

  const sortButtons: SortKey[] = ["goals", "assists", "rating", "shots", "passes", "cards"];

  return (
    <div className="space-y-3">
      {/* Sort buttons */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sortButtons.map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-[10px] sm:text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              sortKey === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {getSortLabel(key)}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-3">
        <span>Player</span>
        <span>{getSortLabel(sortKey)}</span>
      </div>

      {/* Player list */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {sorted.slice(0, 30).map((player, idx) => {
          const rating = parseFloat(player.games.rating || "0");
          const ratingColor = rating >= 7.5 ? "text-green-400" : rating >= 6.5 ? "text-yellow-400" : rating > 0 ? "text-orange-400" : "text-muted-foreground";

          return (
            <div
              key={player.player.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                idx % 2 === 0 ? "bg-secondary/20" : "bg-transparent"
              }`}
            >
              <span className="text-xs font-bold text-primary w-5 flex-shrink-0">{idx + 1}</span>
              <ClickablePlayer playerId={player.player.id} className="flex items-center gap-2 min-w-0">
                <img
                  src={player.player.photo}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover bg-muted flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate hover:text-primary transition-colors">{player.player.name}</p>
                  <div className="flex items-center gap-1">
                    {player.team.logo && (
                      <img src={player.team.logo} alt="" className="h-3 w-3 object-contain" />
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">{player.team.name}</span>
                  </div>
                </div>
              </ClickablePlayer>

              {/* Quick stat badges */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {player.goals > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-green-500/15 text-green-400 border-0">
                    ⚽{player.goals}
                  </Badge>
                )}
                {player.assists > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-400 border-0">
                    🅰️{player.assists}
                  </Badge>
                )}
                {player.cards.yellow > 0 && (
                  <span className="text-[9px]">🟨{player.cards.yellow}</span>
                )}
                {player.cards.red > 0 && (
                  <span className="text-[9px]">🟥{player.cards.red}</span>
                )}
              </div>

              {/* Main sort value */}
              <div className="text-right flex-shrink-0 w-10">
                {sortKey === "rating" ? (
                  <span className={`text-sm font-bold ${ratingColor}`}>
                    {rating > 0 ? rating.toFixed(1) : "–"}
                  </span>
                ) : sortKey === "cards" ? (
                  <span className="text-sm font-bold text-amber-400">
                    {player.cards.yellow + player.cards.red}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {getSortValue(player, sortKey)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Showing top {Math.min(30, sorted.length)} players by {getSortLabel(sortKey).toLowerCase()}
      </p>
    </div>
  );
}
