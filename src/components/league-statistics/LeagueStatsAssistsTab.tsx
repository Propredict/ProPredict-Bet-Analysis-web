import { Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLeagueAssists, AssistsResponse, PlayerStats } from "@/hooks/useLeagueStats";

interface LeagueStatsAssistsTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsAssistsTab({ leagueId, leagueName }: LeagueStatsAssistsTabProps) {
  const { data, isLoading, error } = useLeagueAssists(leagueId);
  
  const players = (data as AssistsResponse)?.players || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-[#0E1627] border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">{leagueName} Top Assists</span>
          </div>
          <span className="text-xs text-muted-foreground">
            📊 Official standings · Updated after round completion
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
        {/* Table Header */}
        <div className="px-4 py-3 bg-primary/20 text-center font-semibold text-sm">
          Top Assists
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error || players.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            No assists data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-0">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground text-[10px] sm:text-xs">
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left w-6">#</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left">Player</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left hidden sm:table-cell">Team</th>
                  <th className="px-1 sm:px-3 py-2 sm:py-3 text-center">GP</th>
                  <th className="px-1 sm:px-3 py-2 sm:py-3 text-center text-purple-400">A</th>
                  <th className="px-1 sm:px-3 py-2 sm:py-3 text-center hidden sm:table-cell">G</th>
                </tr>
              </thead>
              <tbody>
                {players.map((item: PlayerStats, index: number) => (
                  <tr key={item.player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-primary">{index + 1}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3">
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
                    <td className="px-2 sm:px-3 py-2 sm:py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {item.team.logo && (
                          <img src={item.team.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
                        )}
                        <span className="text-muted-foreground truncate max-w-[100px]">{item.team.name}</span>
                      </div>
                    </td>
                    <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-muted-foreground">{item.games.appearances}</td>
                    <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-bold text-purple-400">{item.assists}</td>
                    <td className="px-1 sm:px-3 py-2 sm:py-3 text-center text-muted-foreground hidden sm:table-cell">{item.goals || 0}</td>
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
