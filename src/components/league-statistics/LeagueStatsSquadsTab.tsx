import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeagueSquads, SquadsResponse } from "@/hooks/useLeagueStats";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface Props {
  leagueId: string;
  leagueName: string;
}

const positionOrder: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Attacker: 3,
};

const positionColor: Record<string, string> = {
  Goalkeeper: "bg-yellow-500/15 text-yellow-400",
  Defender: "bg-blue-500/15 text-blue-400",
  Midfielder: "bg-green-500/15 text-green-400",
  Attacker: "bg-red-500/15 text-red-400",
};

export function LeagueStatsSquadsTab({ leagueId, leagueName }: Props) {
  const { data, isLoading, error } = useLeagueSquads(leagueId);
  const squads = (data as SquadsResponse)?.squads || [];
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || squads.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No squad data available for {leagueName}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <span className="font-semibold">{leagueName} Squads</span>
          <span className="text-xs text-muted-foreground ml-auto">{squads.length} teams</span>
        </div>
      </Card>

      {squads.map((squad) => {
        const isExpanded = expandedTeam === squad.team.id;
        const sorted = [...squad.players].sort(
          (a, b) => (positionOrder[a.position] ?? 9) - (positionOrder[b.position] ?? 9)
        );

        return (
          <Card key={squad.team.id} className="bg-card border-border overflow-hidden">
            <button
              onClick={() => setExpandedTeam(isExpanded ? null : squad.team.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <img src={squad.team.logo} alt="" className="w-6 h-6 object-contain" />
                <span className="text-sm font-semibold">{squad.team.name}</span>
                <span className="text-[10px] text-muted-foreground">{squad.players.length} players</span>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="border-t border-white/10">
                {sorted.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <img
                      src={player.photo}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <ClickablePlayer playerId={player.id} className="text-xs font-medium flex-1 min-w-0 truncate hover:text-primary transition-colors">
                      {player.name}
                    </ClickablePlayer>
                    {player.number && (
                      <span className="text-[10px] font-bold text-primary w-5 text-center">#{player.number}</span>
                    )}
                    {player.age && (
                      <span className="text-[10px] text-muted-foreground w-6 text-center">{player.age}y</span>
                    )}
                    <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 border-0 ${positionColor[player.position] || "bg-muted text-muted-foreground"}`}>
                      {player.position?.slice(0, 3).toUpperCase() || "–"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}