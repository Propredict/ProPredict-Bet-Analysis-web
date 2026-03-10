import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InjuryData } from "@/hooks/useMatchDetails";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface InjuriesTabProps {
  injuries: InjuryData[];
  loading: boolean;
}

export function InjuriesTab({ injuries, loading }: InjuriesTabProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (injuries.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No injury data available</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Injury reports may not be available for smaller leagues or cups
        </p>
      </div>
    );
  }

  // Group injuries by team
  const grouped = injuries.reduce<Record<string, { team: InjuryData["team"]; players: InjuryData[] }>>((acc, inj) => {
    const key = String(inj.team.id);
    if (!acc[key]) acc[key] = { team: inj.team, players: [] };
    acc[key].players.push(inj);
    return acc;
  }, {});

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
    <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
      {Object.values(grouped).map(({ team, players }) => (
        <div key={team.id}>
          <div className="flex items-center gap-2 mb-2">
            {team.logo && <img src={team.logo} alt="" className="h-5 w-5 object-contain" />}
            <span className="text-sm font-medium">{team.name}</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">{players.length}</Badge>
          </div>
          <div className="space-y-1">
            {players.map((inj, idx) => (
              <div key={`${inj.player.id}-${idx}`} className="flex items-center gap-2 p-2 rounded-md bg-muted/20">
                {inj.player.photo ? (
                  <img src={inj.player.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px]">?</div>
                )}
                <ClickablePlayer playerId={inj.player.id} className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate hover:text-primary transition-colors">{inj.player.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{inj.player.reason}</p>
                </ClickablePlayer>
                {getTypeBadge(inj.player.type)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}