import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { usePlayerProfileModal } from "@/contexts/PlayerProfileContext";

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  const val = parseFloat(rating || "0");
  if (val <= 0) return <span className="text-xs text-muted-foreground">–</span>;
  const color = val >= 7.5 ? "bg-green-500/20 text-green-400" : val >= 6.5 ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400";
  return <Badge className={`${color} border-0 text-sm font-bold px-2`}>{val.toFixed(1)}</Badge>;
}

export function PlayerProfileModal() {
  const { playerId, isOpen, closePlayer } = usePlayerProfileModal();
  const { data: profile, isLoading } = usePlayerProfile(playerId);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlayer();
    },
    [closePlayer],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={closePlayer} />

      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-background border border-border/30 shadow-2xl pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - always visible */}
          <button
            onClick={closePlayer}
            className="absolute right-3 top-3 z-20 w-8 h-8 rounded-full bg-muted/90 flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>

          {isLoading ? (
            <div className="p-6 pt-0 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !profile ? (
            <div className="p-6 pt-0 text-center text-muted-foreground text-sm">
              Player data not available
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5 pt-0 pb-4">
                <div className="flex items-start gap-4">
                  <img
                    src={profile.player.photo}
                    alt={profile.player.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">{profile.player.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {profile.team.logo && (
                        <img src={profile.team.logo} alt="" className="w-5 h-5 object-contain" />
                      )}
                      <span className="text-sm text-muted-foreground">{profile.team.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] border-0 bg-secondary/50">
                        {profile.stats.position || "–"}
                      </Badge>
                      <RatingBadge rating={profile.stats.rating} />
                      {profile.player.injured && (
                        <Badge variant="destructive" className="text-[10px]">🚑 Injured</Badge>
                      )}
                      {profile.stats.captain && (
                        <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-0">©️ Captain</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player Info */}
              <div className="px-5 pt-3 pb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <StatRow label="Nationality" value={profile.player.nationality || "–"} />
                  <StatRow label="Age" value={profile.player.age || "–"} />
                  <StatRow label="Height" value={profile.player.height || "–"} />
                  <StatRow label="Weight" value={profile.player.weight || "–"} />
                </div>
              </div>

              {/* Season Stats */}
              <div className="px-5 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Season Stats</h3>
                  {profile.league.logo && <img src={profile.league.logo} alt="" className="w-4 h-4 object-contain" />}
                  <span className="text-[10px] text-muted-foreground">{profile.league.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <StatRow label="Appearances" value={profile.stats.appearances} highlight />
                  <StatRow label="Minutes" value={profile.stats.minutes.toLocaleString()} />
                  <StatRow label="Goals" value={profile.stats.goals} highlight />
                  <StatRow label="Assists" value={profile.stats.assists} highlight />
                  <StatRow label="Lineups" value={profile.stats.lineups} />
                  {profile.stats.saves !== null && profile.stats.saves > 0 && (
                    <StatRow label="Saves" value={profile.stats.saves} />
                  )}
                </div>
              </div>

              {/* Shooting & Passing */}
              <div className="px-5 pt-3 pb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shooting & Passing</h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <StatRow label="Shots" value={profile.stats.shots.total} />
                  <StatRow label="On Target" value={profile.stats.shots.on} />
                  <StatRow label="Key Passes" value={profile.stats.passes.key} highlight />
                  <StatRow label="Pass Accuracy" value={`${profile.stats.passes.accuracy}%`} />
                  <StatRow label="Total Passes" value={profile.stats.passes.total} />
                </div>
              </div>

              {/* Defensive */}
              <div className="px-5 pt-3 pb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Defensive</h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <StatRow label="Tackles" value={profile.stats.tackles.total} />
                  <StatRow label="Interceptions" value={profile.stats.tackles.interceptions} />
                  <StatRow label="Blocks" value={profile.stats.tackles.blocks} />
                  <StatRow label="Duels Won" value={`${profile.stats.duels.won}/${profile.stats.duels.total}`} />
                </div>
              </div>

              {/* Dribbles & Fouls */}
              <div className="px-5 pt-3 pb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dribbles & Discipline</h3>
                <div className="grid grid-cols-2 gap-x-4">
                  <StatRow label="Dribbles" value={`${profile.stats.dribbles.success}/${profile.stats.dribbles.attempts}`} />
                  <StatRow label="Fouls Committed" value={profile.stats.fouls.committed} />
                  <StatRow label="Fouls Drawn" value={profile.stats.fouls.drawn} />
                  <StatRow label="Penalties Scored" value={profile.stats.penalty.scored} />
                </div>
              </div>

              {/* Cards */}
              <div className="px-5 pt-3 pb-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cards</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-5 bg-yellow-400 rounded-[2px] inline-block" />
                    <span className="text-sm font-bold">{profile.stats.cards.yellow}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-5 bg-red-500 rounded-[2px] inline-block" />
                    <span className="text-sm font-bold">{profile.stats.cards.red}</span>
                  </div>
                  {profile.stats.cards.yellowred > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-5 rounded-[2px] inline-block bg-gradient-to-r from-yellow-400 to-red-500" />
                      <span className="text-sm font-bold">{profile.stats.cards.yellowred}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transfers */}
              {profile.transfers && profile.transfers.length > 0 && (
                <div className="px-5 pt-3 pb-3 border-t border-white/10">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transfer History</h3>
                  <div className="space-y-1.5">
                    {profile.transfers.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">
                          {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}
                        </span>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {t.teams.from.logo && <img src={t.teams.from.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                          <span className="truncate text-muted-foreground">{t.teams.from.name || '–'}</span>
                        </div>
                        <span className="text-primary font-bold text-[10px]">→</span>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {t.teams.to.logo && <img src={t.teams.to.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                          <span className="truncate">{t.teams.to.name || '–'}</span>
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-secondary/50 flex-shrink-0">
                          {t.type || '–'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trophies */}
              {profile.trophies && profile.trophies.length > 0 && (
                <div className="px-5 pt-3 pb-3 border-t border-white/10">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    🏆 Trophies ({profile.trophies.filter(t => t.place === "Winner").length} won)
                  </h3>
                  <div className="space-y-1">
                    {profile.trophies.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs">
                        <span className={`text-sm ${t.place === "Winner" ? "" : "opacity-40"}`}>
                          {t.place === "Winner" ? "🏆" : t.place === "2nd Place" ? "🥈" : t.place === "3rd Place" ? "🥉" : "🏅"}
                        </span>
                        <span className={`flex-1 truncate ${t.place === "Winner" ? "font-medium" : "text-muted-foreground"}`}>
                          {t.league}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t.season}</span>
                        <span className="text-[10px] text-muted-foreground">{t.country}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sidelined (Injury History) */}
              {profile.sidelined && profile.sidelined.length > 0 && (
                <div className="px-5 pt-3 pb-3 border-t border-white/10">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">🚑 Injury History</h3>
                  <div className="space-y-1">
                    {profile.sidelined.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-destructive/15 text-destructive flex-shrink-0">
                          {s.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex-1">
                          {s.start} → {s.end || 'ongoing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-team info */}
              {profile.allStats.length > 1 && (
                <div className="px-5 pt-1 pb-4 border-t border-white/10">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-2">All Teams This Season</h3>
                  {profile.allStats.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <img src={s.team.logo} alt="" className="w-5 h-5 object-contain" />
                      <span className="text-xs flex-1">{s.team.name}</span>
                      <span className="text-[10px] text-muted-foreground">{s.appearances} GP</span>
                      <span className="text-[10px] text-green-400">{s.goals}G</span>
                      <span className="text-[10px] text-blue-400">{s.assists}A</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}