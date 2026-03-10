import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLeagueYellowCards, YellowCardsResponse } from "@/hooks/useLeagueStats";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface Props {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsYellowCardsTab({ leagueId, leagueName }: Props) {
  const { data, isLoading, error } = useLeagueYellowCards(leagueId);
  const players = (data as YellowCardsResponse)?.players || [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🟨</span>
            <span className="font-semibold">{leagueName} Top Yellow Cards</span>
          </div>
          <span className="text-xs text-muted-foreground">Official stats</span>
        </div>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <div className="px-4 py-3 bg-yellow-500/20 text-center font-semibold text-sm">
          Top Yellow Cards
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error || players.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            No yellow cards data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-0">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground text-[10px] sm:text-xs">
                  <th className="px-2 sm:px-3 py-2 text-left w-6">#</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Player</th>
                  <th className="px-2 sm:px-3 py-2 text-left hidden sm:table-cell">Team</th>
                  <th className="px-1 sm:px-3 py-2 text-center">GP</th>
                  <th className="px-1 sm:px-3 py-2 text-center text-yellow-400">🟨</th>
                  <th className="px-1 sm:px-3 py-2 text-center hidden sm:table-cell text-red-400">🟥</th>
                  <th className="px-1 sm:px-3 py-2 text-center hidden md:table-cell">Fouls</th>
                </tr>
              </thead>
              <tbody>
                {players.map((item, index) => (
                  <tr key={item.player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-2 sm:px-3 py-2 font-bold text-primary">{index + 1}</td>
                    <td className="px-2 sm:px-3 py-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {item.player.photo && (
                          <img src={item.player.photo} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{item.player.name}</div>
                          <div className="text-[9px] sm:text-xs text-muted-foreground truncate sm:hidden">{item.team.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-2 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {item.team.logo && <img src={item.team.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />}
                        <span className="text-muted-foreground truncate max-w-[100px]">{item.team.name}</span>
                      </div>
                    </td>
                    <td className="px-1 sm:px-3 py-2 text-center text-muted-foreground">{item.games.appearances}</td>
                    <td className="px-1 sm:px-3 py-2 text-center font-bold text-yellow-400">{item.cards.yellow}</td>
                    <td className="px-1 sm:px-3 py-2 text-center text-red-400 hidden sm:table-cell">{item.cards.red}</td>
                    <td className="px-1 sm:px-3 py-2 text-center text-muted-foreground hidden md:table-cell">{item.fouls.committed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
