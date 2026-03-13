import { useState, useMemo } from "react";
import { TeamLineup, PlayerLineup, TeamColors } from "@/hooks/useMatchDetails";
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

/* ── Color helpers ── */
function hexToStyle(hex: string | undefined | null): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith("#") ? hex : `#${hex}`;
}

function colorsTooSimilar(a: string, b: string): boolean {
  const cleanA = (a.startsWith("#") ? a.slice(1) : a).toLowerCase();
  const cleanB = (b.startsWith("#") ? b.slice(1) : b).toLowerCase();
  if (cleanA === cleanB) return true;
  const rA = parseInt(cleanA.slice(0, 2), 16), gA = parseInt(cleanA.slice(2, 4), 16), bA = parseInt(cleanA.slice(4, 6), 16);
  const rB = parseInt(cleanB.slice(0, 2), 16), gB = parseInt(cleanB.slice(2, 4), 16), bB = parseInt(cleanB.slice(4, 6), 16);
  return Math.sqrt((rA - rB) ** 2 + (gA - gB) ** 2 + (bA - bB) ** 2) < 80;
}

type JerseyColor = { primary: string; number: string; border: string };

const FALLBACK_HOME: JerseyColor = { primary: "#10b981", number: "#ecfdf5", border: "#10b981" };
const FALLBACK_AWAY: JerseyColor = { primary: "#f97316", number: "#fff7ed", border: "#f97316" };
const ALT_AWAY: JerseyColor[] = [
  { primary: "#3b82f6", number: "#eff6ff", border: "#3b82f6" },
  { primary: "#ef4444", number: "#fef2f2", border: "#ef4444" },
  { primary: "#a855f7", number: "#faf5ff", border: "#a855f7" },
  { primary: "#eab308", number: "#422006", border: "#eab308" },
];

function parseColorSet(cs: { primary: string; number: string; border: string } | null | undefined, fallback: JerseyColor): JerseyColor {
  if (!cs?.primary) return fallback;
  return { primary: hexToStyle(cs.primary)!, number: hexToStyle(cs.number) || "#fff", border: hexToStyle(cs.border) || hexToStyle(cs.primary)! };
}

function resolveJerseyColors(homeColors: TeamColors | null, awayColors: TeamColors | null) {
  let home = parseColorSet(homeColors?.player, FALLBACK_HOME);
  let away = parseColorSet(awayColors?.player, FALLBACK_AWAY);

  if (colorsTooSimilar(home.primary, away.primary)) {
    const alt = ALT_AWAY.find(c => !colorsTooSimilar(home.primary, c.primary));
    if (alt) away = alt;
  }

  const homeGK = parseColorSet(homeColors?.goalkeeper, { primary: "#eab308", number: "#422006", border: "#eab308" });
  const awayGK = parseColorSet(awayColors?.goalkeeper, { primary: "#06b6d4", number: "#083344", border: "#06b6d4" });

  return { home, away, homeGK, awayGK };
}

/* ── Pitch View ── */
function PitchPlayer({ player, jerseyColors }: { player: PlayerLineup; jerseyColors: JerseyColor }) {
  return (
    <ClickablePlayer playerId={player.id} className="flex flex-col items-center gap-0 group">
      <div className="relative w-7 h-8 sm:w-8 sm:h-9 group-hover:scale-110 transition-transform">
        <svg viewBox="0 0 32 36" fill="none" className="w-full h-full drop-shadow-md">
          <path
            d="M8 2L2 8V14L6 13V32H26V13L30 14V8L24 2H20L16 6L12 2H8Z"
            fill={jerseyColors.primary}
            fillOpacity="0.9"
            stroke={jerseyColors.border}
            strokeWidth="1.2"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-bold pt-1" style={{ color: jerseyColors.number }}>
          {player.number || "—"}
        </span>
      </div>
      <span className="text-[8px] sm:text-[9px] text-foreground/80 font-medium truncate max-w-[44px] sm:max-w-[52px] text-center leading-tight group-hover:text-primary transition-colors">
        {player.name?.split(" ").pop() || "?"}
      </span>
    </ClickablePlayer>
  );
}

function PitchFormation({ lineup, isAway, jerseyColors }: { lineup: TeamLineup; isAway: boolean; jerseyColors: { player: JerseyColor; gk: JerseyColor } }) {
  const players = lineup.startXI || [];
  const hasGrid = players.some(p => p.grid);

  if (!hasGrid || players.length === 0) return null;

  const rows = new Map<number, PlayerLineup[]>();
  for (const p of players) {
    if (!p.grid) continue;
    const [r] = p.grid.split(":").map(Number);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r)!.push(p);
  }

  const sortedRowKeys = [...rows.keys()].sort((a, b) => isAway ? b - a : a - b);

  for (const [, rowPlayers] of rows) {
    rowPlayers.sort((a, b) => {
      const colA = parseInt(a.grid!.split(":")[1]);
      const colB = parseInt(b.grid!.split(":")[1]);
      return colA - colB;
    });
  }

  return (
    <div className="flex flex-row items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 flex-1 min-w-0 overflow-hidden">
      {/* Team name + formation */}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 mr-0.5 sm:mr-1 min-w-[28px] sm:min-w-[32px] shrink-0">
        {lineup.team?.logo && <img src={lineup.team.logo} alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" />}
        <span className="text-[8px] sm:text-[9px] font-semibold text-foreground/70 whitespace-nowrap">{lineup.formation}</span>
      </div>
      {sortedRowKeys.map((rowKey) => (
        <div key={rowKey} className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-1 flex-1 min-w-0">
          {rows.get(rowKey)!.map((p) => (
            <PitchPlayer key={p.id} player={p} jerseyColors={p.pos === "G" ? jerseyColors.gk : jerseyColors.player} />
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

  const colors = useMemo(
    () => resolveJerseyColors(home.team?.colors || null, away.team?.colors || null),
    [home.team?.colors, away.team?.colors]
  );

  return (
    <div className="relative mx-2 sm:mx-4 mb-3 rounded-xl overflow-hidden border border-border/30">
      {/* Pitch background - horizontal */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-orange-900/30 relative min-h-[280px]">
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/15" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-32 border-r border-t border-b border-white/10 rounded-r-sm" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-32 border-l border-t border-b border-white/10 rounded-l-sm" />
        </div>

        <div className="relative z-10 flex flex-row h-full min-h-[280px]">
          <PitchFormation lineup={home} isAway={false} jerseyColors={{ player: colors.home, gk: colors.homeGK }} />
          <div className="w-px" />
          <PitchFormation lineup={away} isAway={true} jerseyColors={{ player: colors.away, gk: colors.awayGK }} />
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

      {hasPitchData && showPitch && <PitchView lineups={lineups} />}

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
