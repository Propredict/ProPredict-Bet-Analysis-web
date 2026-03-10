import { useState } from "react";
import { TeamLineup, PlayerLineup } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { ClickablePlayer } from "@/components/ClickablePlayer";

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
        <ClickablePlayer playerId={player.id}>
          <span className="text-sm text-foreground hover:text-primary transition-colors">
            {player.name || "Unknown"}
          </span>
        </ClickablePlayer>
      </div>
      <span className="text-xs text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded">
        {posLabel}
      </span>
    </div>
  );
}

/* ── Pitch View ── */
function PitchPlayer({ player, isAway }: { player: PlayerLineup; isAway: boolean }) {
  return (
    <ClickablePlayer playerId={player.id} className="flex flex-col items-center gap-0.5 group">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors group-hover:scale-110",
        isAway
          ? "bg-orange-500/20 border-orange-400 text-orange-300"
          : "bg-emerald-500/20 border-emerald-400 text-emerald-300"
      )}>
        {player.number || "—"}
      </div>
      <span className="text-[9px] text-foreground/80 font-medium truncate max-w-[56px] text-center leading-tight group-hover:text-primary transition-colors">
        {player.name?.split(" ").pop() || "?"}
      </span>
    </ClickablePlayer>
  );
}

function PitchFormation({ lineup, isAway }: { lineup: TeamLineup; isAway: boolean }) {
  const players = lineup.startXI || [];
  const hasGrid = players.some(p => p.grid);

  if (!hasGrid || players.length === 0) return null;

  // Parse grid "row:col" → group by rows
  const rows = new Map<number, PlayerLineup[]>();
  for (const p of players) {
    if (!p.grid) continue;
    const [r] = p.grid.split(":").map(Number);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(p);
  }

  // Sort rows: for away team reverse so goalkeeper is at bottom
  const sortedRowKeys = [...rows.keys()].sort((a, b) => isAway ? b - a : a - b);

  // Sort players within each row by column
  for (const [, rowPlayers] of rows) {
    rowPlayers.sort((a, b) => {
      const colA = parseInt(a.grid!.split(":")[1]);
      const colB = parseInt(b.grid!.split(":")[1]);
      return colA - colB;
    });
  }

  return (
    <div className="flex flex-row items-center gap-1 px-1 flex-1">
      {/* Team name + formation */}
      <div className="flex flex-col items-center gap-1 mr-1 min-w-[32px]">
        {lineup.team?.logo && <img src={lineup.team.logo} alt="" className="w-4 h-4 object-contain" />}
        <span className="text-[9px] font-semibold text-foreground/70 whitespace-nowrap">{lineup.formation}</span>
      </div>
      {sortedRowKeys.map((rowKey) => (
        <div key={rowKey} className="flex flex-col items-center justify-center gap-1.5 py-1 flex-1">
          {rows.get(rowKey)!.map((p) => (
            <PitchPlayer key={p.id} player={p} isAway={isAway} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PitchView({ lineups }: { lineups: TeamLineup[] }) {
  const home = lineups[0];
  const away = lineups[1];
  if (!home || !away) return null;

  const homeHasGrid = home.startXI?.some(p => p.grid);
  const awayHasGrid = away.startXI?.some(p => p.grid);
  if (!homeHasGrid && !awayHasGrid) return null;

  return (
    <div className="relative mx-4 mb-3 rounded-xl overflow-hidden border border-border/30">
      {/* Pitch background - horizontal */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-orange-900/30 relative min-h-[280px]">
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Center line (vertical) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10" />
          {/* Center dot */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/15" />
          {/* Left penalty area */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-32 border-r border-t border-b border-white/10 rounded-r-sm" />
          {/* Right penalty area */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-32 border-l border-t border-b border-white/10 rounded-l-sm" />
        </div>

        <div className="relative z-10 flex flex-row h-full min-h-[280px]">
          <PitchFormation lineup={home} isAway={false} />
          {/* Divider */}
          <div className="w-px" />
          <PitchFormation lineup={away} isAway={true} />
        </div>
      </div>
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
  const [showPitch, setShowPitch] = useState(true);

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
        <p className="text-xs text-muted-foreground">Lineups may not be available for smaller leagues or cups</p>
      </div>
    );
  }

  const hasPitchData = lineups.length >= 2 && 
    lineups.some(l => l.startXI?.some(p => p.grid));

  return (
    <div className="pt-3 pb-4 max-h-[450px] overflow-y-auto">
      {/* Toggle between pitch and list view */}
      {hasPitchData && (
        <div className="flex justify-center mb-3 px-4">
          <div className="inline-flex bg-secondary/50 rounded-lg p-1 border border-border/40">
            <button
              onClick={() => setShowPitch(true)}
              className={cn(
                "text-[10px] px-3 py-1.5 rounded-md font-medium transition-all",
                showPitch ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              ⚽ Pitch View
            </button>
            <button
              onClick={() => setShowPitch(false)}
              className={cn(
                "text-[10px] px-3 py-1.5 rounded-md font-medium transition-all",
                !showPitch ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              📋 List View
            </button>
          </div>
        </div>
      )}

      {/* Pitch Formation View */}
      {hasPitchData && showPitch && <PitchView lineups={lineups} />}

      {/* List View */}
      {(!hasPitchData || !showPitch) && (
        <div className="px-4 grid grid-cols-2 gap-4">
          {lineups.slice(0, 2).map((lineup, idx) => (
            <TeamCard key={lineup.team?.id || idx} lineup={lineup} />
          ))}
        </div>
      )}
    </div>
  );
}
