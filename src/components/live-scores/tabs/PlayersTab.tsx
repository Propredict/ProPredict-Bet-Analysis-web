import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TeamPlayersStats, PlayerMatchStats } from "@/hooks/useMatchDetails";
import { useState } from "react";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface PlayersTabProps {
  players: TeamPlayersStats[];
  loading: boolean;
}

type SortKey = "rating" | "goals" | "assists" | "shots" | "passes" | "tackles";

function getStatValue(p: PlayerMatchStats, key: SortKey): number {
  const s = p.statistics?.[0];
  if (!s) return 0;
  switch (key) {
    case "rating": return parseFloat(s.games?.rating || "0");
    case "goals": return s.goals?.total || 0;
    case "assists": return s.goals?.assists || 0;
    case "shots": return s.shots?.total || 0;
    case "passes": return s.passes?.total || 0;
    case "tackles": return s.tackles?.total || 0;
  }
}

function PlayerRow({ player, index }: { player: PlayerMatchStats; index: number }) {
  const s = player.statistics?.[0];
  if (!s) return null;

  const rating = parseFloat(s.games?.rating || "0");
  const ratingColor = rating >= 7.5 ? "text-green-400" : rating >= 6.5 ? "text-yellow-400" : rating > 0 ? "text-orange-400" : "text-muted-foreground";

  return (
    <div className={`flex items-center gap-2 px-3 py-2 text-xs ${index % 2 === 0 ? "bg-secondary/20" : ""}`}>
      <img src={player.player.photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{player.player.name}</p>
        <p className="text-muted-foreground text-[10px]">
          {s.games?.position || "–"} • {s.games?.minutes || 0}'
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {(s.goals?.total || 0) > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400">
            ⚽ {s.goals.total}
          </Badge>
        )}
        {(s.goals?.assists || 0) > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400">
            🅰️ {s.goals.assists}
          </Badge>
        )}
        {(s.cards?.yellow || 0) > 0 && (
          <span className="w-3 h-4 bg-yellow-400 rounded-[1px] inline-block" />
        )}
        {(s.cards?.red || 0) > 0 && (
          <span className="w-3 h-4 bg-red-500 rounded-[1px] inline-block" />
        )}
        <span className={`font-bold text-sm w-8 text-right ${ratingColor}`}>
          {rating > 0 ? rating.toFixed(1) : "–"}
        </span>
      </div>
    </div>
  );
}

export function PlayersTab({ players, loading }: PlayersTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rating");

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Player statistics not available for this match.
      </div>
    );
  }

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "rating", label: "Rating" },
    { key: "goals", label: "Goals" },
    { key: "assists", label: "Assists" },
    { key: "shots", label: "Shots" },
    { key: "passes", label: "Passes" },
  ];

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {/* Sort buttons */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-white/10 overflow-x-auto">
        {sortButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
              sortKey === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {players.map((team) => {
        const sorted = [...(team.players || [])].sort(
          (a, b) => getStatValue(b, sortKey) - getStatValue(a, sortKey)
        );

        return (
          <div key={team.team.id}>
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-b border-white/10">
              <img src={team.team.logo} alt="" className="w-5 h-5 object-contain" />
              <span className="text-xs font-semibold">{team.team.name}</span>
            </div>
            {sorted.map((p, i) => (
              <PlayerRow key={p.player.id} player={p} index={i} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
