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
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold">{leagueName} Top Assists</span>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground text-xs">
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left">Player</th>
                  <th className="px-3 py-3 text-left">Team</th>
                  <th className="px-3 py-3 text-center">Games</th>
                  <th className="px-3 py-3 text-center text-purple-400">Assists</th>
                  <th className="px-3 py-3 text-center">Goals</th>
                </tr>
              </thead>
              <tbody>
                {players.map((item: PlayerStats, index: number) => (
                  <tr key={item.player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3 font-bold text-primary">{index + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {item.player.photo && (
                          <img src={item.player.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                        )}
                        <div>
                          <div className="font-medium">{item.player.name}</div>
                          <div className="text-xs text-muted-foreground">{item.player.nationality}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {item.team.logo && (
                          <img src={item.team.logo} alt="" className="w-5 h-5 object-contain" />
                        )}
                        <span className="text-muted-foreground">{item.team.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{item.games.appearances}</td>
                    <td className="px-3 py-3 text-center font-bold text-purple-400">{item.assists}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{item.goals || 0}</td>
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
