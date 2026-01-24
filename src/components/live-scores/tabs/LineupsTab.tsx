import { TeamLineup, PlayerLineup } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";

interface LineupsTabProps {
  lineups: TeamLineup[];
  loading: boolean;
}

function PlayerRow({ player }: { player: PlayerLineup }) {
  const posLabel = player.pos || "—";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {player.number || "—"}
        </span>
        <span className="text-sm text-foreground">{player.name || "Unknown"}</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded">
        {posLabel}
      </span>
    </div>
  );
}

function TeamCard({ lineup }: { lineup: TeamLineup }) {
  const hasStartXI = lineup.startXI && lineup.startXI.length > 0;
  const hasSubstitutes = lineup.substitutes && lineup.substitutes.length > 0;

  return (
    <div className="bg-card/40 rounded-lg border border-border/40 overflow-hidden">
      {/* Team Header with Formation */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/30">
        <div className="flex items-center gap-2">
          {lineup.team?.logo && (
            <img src={lineup.team.logo} alt="" className="w-5 h-5 object-contain" />
          )}
          <span className="font-semibold text-sm text-foreground">
            {lineup.team?.name || "Team"}
          </span>
        </div>
        {lineup.formation && (
          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
            {lineup.formation}
          </span>
        )}
      </div>

      {/* Coach */}
      {lineup.coach && (
        <div className="px-3 py-2.5 border-b border-border/20 flex items-center gap-3">
          {lineup.coach.photo ? (
            <img src={lineup.coach.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-muted" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">👤</div>
          )}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Coach</div>
            <div className="text-sm font-medium text-foreground">{lineup.coach.name}</div>
          </div>
        </div>
      )}

      {/* Starting XI */}
      <div className="p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Starting XI</div>
        {hasStartXI ? (
          <div className="space-y-0">
            {lineup.startXI.slice(0, 11).map((player, idx) => (
              <PlayerRow key={player.id || idx} player={player} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-3 text-center">No lineup data</p>
        )}
      </div>

      {/* Substitutes */}
      {hasSubstitutes && (
        <div className="px-3 pb-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium pt-2 border-t border-border/30">
            Substitutes
          </div>
          <div className="space-y-0 max-h-32 overflow-y-auto">
            {lineup.substitutes.slice(0, 9).map((player, idx) => (
              <PlayerRow key={player.id || idx} player={player} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LineupsTab({ lineups, loading }: LineupsTabProps) {
  if (loading) {
    return (
      <div className="p-4 grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse bg-card/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-5 w-12 bg-muted rounded" />
            </div>
            <div className="space-y-2 pt-2">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-muted rounded-full" />
                  <div className="h-4 flex-1 bg-muted rounded" />
                  <div className="h-5 w-8 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Check if lineups have actual player data
  const hasValidLineups = lineups && lineups.length > 0 && 
    lineups.some(l => l.startXI && l.startXI.length > 0);

  if (!hasValidLineups) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Lineups not available</p>
        <p className="text-xs text-muted-foreground">Lineups are usually published 1 hour before kick-off</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[450px] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        {lineups.slice(0, 2).map((lineup, idx) => (
          <TeamCard key={lineup.team?.id || idx} lineup={lineup} />
        ))}
      </div>
    </div>
  );
}
