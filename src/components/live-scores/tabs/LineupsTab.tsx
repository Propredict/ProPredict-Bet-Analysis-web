import { TeamLineup, PlayerLineup } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";

interface LineupsTabProps {
  lineups: TeamLineup[];
  loading: boolean;
}

// Map position codes to readable labels
const positionLabels: Record<string, string> = {
  G: "G",
  D: "D",
  M: "M",
  F: "F",
};

function PlayerRow({ player, index }: { player: PlayerLineup; index: number }) {
  const posLabel = positionLabels[player.pos] || player.pos || "—";

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <span className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium text-primary">
        {player.number}
      </span>
      <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
        {player.name}
      </span>
      <span className="w-6 h-6 rounded bg-muted/30 flex items-center justify-center text-xs text-muted-foreground font-medium">
        {posLabel}
      </span>
    </div>
  );
}

function TeamLineupCard({ lineup }: { lineup: TeamLineup }) {
  return (
    <div className="bg-card/30 rounded-lg border border-border/30 overflow-hidden">
      {/* Team Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2">
          {lineup.team?.logo && (
            <img
              src={lineup.team.logo}
              alt=""
              className="w-5 h-5 object-contain"
            />
          )}
          <span className="font-medium text-sm text-foreground">
            {lineup.team?.name || "Team"}
          </span>
        </div>
        {lineup.formation && (
          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
            {lineup.formation}
          </span>
        )}
      </div>

      {/* Coach */}
      {lineup.coach && (
        <div className="px-3 py-2 border-b border-border/20 flex items-center gap-2">
          {lineup.coach.photo && (
            <img
              src={lineup.coach.photo}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          )}
          <div className="text-xs">
            <span className="text-muted-foreground">Coach</span>
            <p className="text-foreground font-medium">{lineup.coach.name}</p>
          </div>
        </div>
      )}

      {/* Starting XI */}
      <div className="p-3">
        <div className="text-xs text-muted-foreground mb-2 font-medium">Starting XI</div>
        <div className="space-y-0.5">
          {lineup.startXI?.slice(0, 11).map((player, idx) => (
            <PlayerRow key={player.id || idx} player={player} index={idx} />
          ))}
          {(!lineup.startXI || lineup.startXI.length === 0) && (
            <p className="text-xs text-muted-foreground py-2">No lineup data</p>
          )}
        </div>
      </div>

      {/* Substitutes */}
      {lineup.substitutes && lineup.substitutes.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-xs text-muted-foreground mb-2 font-medium pt-2 border-t border-border/20">
            Substitutes
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {lineup.substitutes.slice(0, 9).map((player, idx) => (
              <PlayerRow key={player.id || idx} player={player} index={idx} />
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
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="space-y-2">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="flex gap-2">
                  <div className="h-5 w-5 bg-muted rounded-full" />
                  <div className="h-5 flex-1 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!lineups || lineups.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Lineups not available for this match</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Lineups are usually published 1 hour before kick-off</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[400px] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        {lineups.slice(0, 2).map((lineup, idx) => (
          <TeamLineupCard key={lineup.team?.id || idx} lineup={lineup} />
        ))}
      </div>
    </div>
  );
}
