import { useState, useMemo } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useLeagueInjuries } from "@/hooks/useLeagueStats";

interface LeagueStatsInjuriesTabProps {
  leagueId: string;
  leagueName: string;
}

export function LeagueStatsInjuriesTab({ leagueId, leagueName }: LeagueStatsInjuriesTabProps) {
  const { data, isLoading } = useLeagueInjuries(leagueId, "2025");
  const [search, setSearch] = useState("");

  const injuries = useMemo(() => {
    if (!data || data.type !== "injuries") return [];
    return (data as any).injuries || [];
  }, [data]);

  const filtered = useMemo(() => {
    if (!search) return injuries;
    const q = search.toLowerCase();
    return injuries.filter((inj: any) =>
      inj.player.name.toLowerCase().includes(q) ||
      inj.team.name.toLowerCase().includes(q) ||
      inj.player.reason.toLowerCase().includes(q)
    );
  }, [injuries, search]);

  // Group by team
  const grouped = useMemo(() => {
    const map = new Map<string, { team: any; players: any[] }>();
    for (const inj of filtered) {
      const key = String(inj.team.id);
      if (!map.has(key)) map.set(key, { team: inj.team, players: [] });
      map.get(key)!.players.push(inj);
    }
    return Array.from(map.values()).sort((a, b) => b.players.length - a.players.length);
  }, [filtered]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-secondary" />
          ))}
        </div>
      </Card>
    );
  }

  const getTypeBadge = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("missing") || lower === "out") {
      return <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]">Out</Badge>;
    }
    if (lower.includes("doubtful")) {
      return <Badge className="bg-yellow-500/15 text-yellow-500 border-0 text-[10px]">Doubtful</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="font-semibold">{leagueName} Injuries & Suspensions</span>
          <Badge variant="outline" className="ml-auto">{injuries.length} players</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search player, team or injury..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No injury data available for {leagueName}.</p>
        </Card>
      ) : (
        grouped.map(({ team, players }) => (
          <Card key={team.id} className="bg-card border-border overflow-hidden">
            <div className="px-4 py-2 bg-destructive/5 border-b border-border flex items-center gap-2">
              {team.logo && <img src={team.logo} alt="" className="h-5 w-5 object-contain" />}
              <span className="text-sm font-semibold">{team.name}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{players.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {players.map((inj: any, idx: number) => (
                <div key={`${inj.player.id}-${idx}`} className="flex items-center gap-3 px-4 py-3">
                  {inj.player.photo ? (
                    <img src={inj.player.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inj.player.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{inj.player.reason}</p>
                  </div>
                  {getTypeBadge(inj.player.type)}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
