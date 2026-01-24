import { TeamLineup } from "@/hooks/useMatchDetails";
import { Users } from "lucide-react";

interface LineupsTabProps {
  lineups: TeamLineup[];
  loading: boolean;
}

export function LineupsTab({ lineups, loading }: LineupsTabProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading lineups…
      </div>
    );
  }

  if (!lineups || lineups.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Lineups not available for this match
      </div>
    );
  }

  const homeLineup = lineups[0];
  const awayLineup = lineups[1];

  return (
    <div className="p-4 max-h-[400px] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        {/* Home Team */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {homeLineup?.team?.logo && (
              <img
                src={homeLineup.team.logo}
                alt={homeLineup.team.name}
                className="w-5 h-5 object-contain"
              />
            )}
            <span className="font-medium text-sm truncate">
              {homeLineup?.team?.name || "Home"}
            </span>
          </div>

          {homeLineup?.formation && (
            <div className="text-xs text-muted-foreground">
              Formation: {homeLineup.formation}
            </div>
          )}

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Starting XI
            </div>
            {homeLineup?.startXI?.map((player, idx) => (
              <div key={idx} className="text-xs flex items-center gap-2 py-0.5">
                <span className="w-5 text-center text-muted-foreground">
                  {player.number}
                </span>
                <span className="truncate">{player.name}</span>
                <span className="text-muted-foreground ml-auto">{player.pos}</span>
              </div>
            ))}
          </div>

          {homeLineup?.substitutes?.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-xs font-medium text-muted-foreground">Substitutes</div>
              {homeLineup.substitutes.slice(0, 7).map((player, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2 py-0.5 opacity-70">
                  <span className="w-5 text-center text-muted-foreground">
                    {player.number}
                  </span>
                  <span className="truncate">{player.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-medium text-sm truncate">
              {awayLineup?.team?.name || "Away"}
            </span>
            {awayLineup?.team?.logo && (
              <img
                src={awayLineup.team.logo}
                alt={awayLineup.team.name}
                className="w-5 h-5 object-contain"
              />
            )}
          </div>

          {awayLineup?.formation && (
            <div className="text-xs text-muted-foreground text-right">
              Formation: {awayLineup.formation}
            </div>
          )}

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 justify-end">
              Starting XI <Users className="h-3 w-3" />
            </div>
            {awayLineup?.startXI?.map((player, idx) => (
              <div key={idx} className="text-xs flex items-center gap-2 py-0.5 justify-end">
                <span className="text-muted-foreground mr-auto">{player.pos}</span>
                <span className="truncate">{player.name}</span>
                <span className="w-5 text-center text-muted-foreground">
                  {player.number}
                </span>
              </div>
            ))}
          </div>

          {awayLineup?.substitutes?.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-xs font-medium text-muted-foreground text-right">Substitutes</div>
              {awayLineup.substitutes.slice(0, 7).map((player, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2 py-0.5 opacity-70 justify-end">
                  <span className="truncate">{player.name}</span>
                  <span className="w-5 text-center text-muted-foreground">
                    {player.number}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
