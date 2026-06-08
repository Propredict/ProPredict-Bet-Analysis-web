import { useState, useMemo } from "react";
import { Trophy, Lock, Calendar, MapPin, Zap, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorldCupBracket, type BracketMatch, type BracketRound } from "@/hooks/useWorldCupBracket";
import { useChampionPrediction } from "@/hooks/useChampionPrediction";
import { MatchDetailModal } from "@/components/live-scores/MatchDetailModal";
import type { Match, MatchStatus } from "@/hooks/useLiveScores";
import { teamFlag } from "@/lib/wcTeamFlags";

function statusToMatchStatus(s: string): MatchStatus {
  if (["1H", "2H", "ET", "P", "LIVE", "BT"].includes(s)) return "live";
  if (s === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(s)) return "finished";
  return "upcoming";
}

function bracketToMatch(b: BracketMatch): Match | null {
  if (!b.fixture_id) return null;
  const status = statusToMatchStatus(b.status);
  const startTime = b.date
    ? new Date(b.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";
  return {
    id: String(b.fixture_id),
    homeTeam: b.home.name ?? "TBD",
    awayTeam: b.away.name ?? "TBD",
    homeTeamId: b.home.id ?? 0,
    awayTeamId: b.away.id ?? 0,
    homeScore: b.home_score,
    awayScore: b.away_score,
    status,
    minute: null,
    startTime,
    league: "FIFA World Cup 2026",
    leagueCountry: "World",
    leagueLogo: null,
    homeLogo: b.home.logo,
    awayLogo: b.away.logo,
  };
}

const ROUND_LABEL: Record<BracketRound, string> = {
  Final: "Final",
  "Semi-finals": "Semifinals",
  "Quarter-finals": "Quarterfinals",
  "Round of 16": "Round of 16",
  "Round of 32": "Round of 32",
  "3rd Place Final": "Third Place",
};

const ROUND_SLOTS: Record<BracketRound, number> = {
  Final: 1,
  "Semi-finals": 2,
  "Quarter-finals": 4,
  "Round of 16": 8,
  "Round of 32": 16,
  "3rd Place Final": 1,
};

function fmtDate(iso: string | null): string {
  if (!iso) return "TBD";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Belgrade",
    });
  } catch {
    return "TBD";
  }
}

function isLive(status: string): boolean {
  return ["1H", "2H", "ET", "P", "LIVE", "HT", "BT"].includes(status);
}

function isFinished(status: string): boolean {
  return ["FT", "AET", "PEN"].includes(status);
}

function MatchCard({
  match,
  size = "md",
  onClick,
  isPick = false,
}: {
  match: BracketMatch | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  isPick?: boolean;
}) {
  const empty = !match;
  const live = match ? isLive(match.status) : false;
  const finished = match ? isFinished(match.status) : false;

  const sizeClasses = {
    sm: "p-2 text-[10px]",
    md: "p-2.5 text-[11px]",
    lg: "p-3 text-sm",
  }[size];

  const logoSize = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <button
      onClick={onClick}
      disabled={empty || !onClick}
      className={`group w-full text-left rounded-lg border transition-all ${sizeClasses} ${
        empty
          ? "border-dashed border-border/40 bg-muted/10"
          : live
            ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_-8px_rgba(16,185,129,0.4)]"
            : isPick
              ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_24px_-8px_rgba(245,158,11,0.5)] hover:border-amber-400/80 hover:bg-amber-500/10"
              : "border-border/60 bg-card/80 hover:border-primary/40 hover:bg-primary/5"
      } ${onClick && !empty ? "cursor-pointer" : "cursor-default"}`}
    >
      {empty ? (
        <div className="flex flex-col items-center justify-center py-2 opacity-50">
          <Lock className="h-3 w-3 text-muted-foreground/50 mb-1" />
          <span className="text-[9px] text-muted-foreground">TBD</span>
        </div>
      ) : (
        <>
          {isPick && (
            <div className="flex items-center justify-end mb-1 -mt-0.5">
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-amber-500/60 text-amber-400 gap-0.5">
                <Target className="h-2 w-2" />
                Your Pick
              </Badge>
            </div>
          )}
          {/* Home team */}
          <div
            className={`flex items-center justify-between gap-2 ${
              finished && match!.winner === "away" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[13px] leading-none shrink-0" aria-hidden>
                {teamFlag(match!.home.name)}
              </span>
              {match!.home.logo ? (
                <img
                  src={match!.home.logo}
                  alt=""
                  className={`${logoSize} object-contain shrink-0`}
                  loading="lazy"
                />
              ) : (
                <div className={`${logoSize} bg-muted rounded shrink-0`} />
              )}
              <span className="truncate font-medium text-foreground">
                {match!.home.name || "TBD"}
              </span>
            </div>
            {(finished || live) && (
              <span
                className={`font-bold tabular-nums ${
                  finished && match!.winner === "home" ? "text-emerald-400" : "text-foreground"
                }`}
              >
                {match!.home_score ?? "-"}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/30 my-1" />

          {/* Away team */}
          <div
            className={`flex items-center justify-between gap-2 ${
              finished && match!.winner === "home" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[13px] leading-none shrink-0" aria-hidden>
                {teamFlag(match!.away.name)}
              </span>
              {match!.away.logo ? (
                <img
                  src={match!.away.logo}
                  alt=""
                  className={`${logoSize} object-contain shrink-0`}
                  loading="lazy"
                />
              ) : (
                <div className={`${logoSize} bg-muted rounded shrink-0`} />
              )}
              <span className="truncate font-medium text-foreground">
                {match!.away.name || "TBD"}
              </span>
            </div>
            {(finished || live) && (
              <span
                className={`font-bold tabular-nums ${
                  finished && match!.winner === "away" ? "text-emerald-400" : "text-foreground"
                }`}
              >
                {match!.away_score ?? "-"}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/20">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {fmtDate(match!.date)}
            </span>
            {live && (
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-emerald-500/50 text-emerald-400 animate-pulse">
                LIVE
              </Badge>
            )}
            {finished && (
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-border/40 text-muted-foreground">
                FT
              </Badge>
            )}
          </div>
        </>
      )}
    </button>
  );
}

function RoundSection({
  title,
  matches,
  slots,
  size = "md",
  scrollable = false,
  highlight = false,
  onMatchClick,
  pickTeam,
}: {
  title: string;
  matches: BracketMatch[];
  slots: number;
  size?: "sm" | "md" | "lg";
  scrollable?: boolean;
  highlight?: boolean;
  onMatchClick?: (m: BracketMatch) => void;
  pickTeam?: string | null;
}) {
  const filled: (BracketMatch | null)[] = Array.from({ length: slots }, (_, i) => matches[i] || null);
  const filledCount = matches.length;

  const matchIsPick = (m: BracketMatch | null) => {
    if (!m || !pickTeam) return false;
    const p = pickTeam.toLowerCase();
    return m.home.name?.toLowerCase() === p || m.away.name?.toLowerCase() === p;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3
          className={`text-xs font-bold uppercase tracking-wider ${
            highlight ? "text-amber-400" : "text-foreground"
          }`}
        >
          {title}
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {filledCount}/{slots}
        </span>
      </div>

      {size === "lg" ? (
        // Final card — single, large, premium
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-fuchsia-500/10 to-amber-500/20 blur-xl rounded-2xl" />
          <div className="relative">
            <MatchCard
              match={filled[0]}
              size="lg"
              isPick={matchIsPick(filled[0])}
              onClick={filled[0] && onMatchClick ? () => onMatchClick(filled[0]!) : undefined}
            />
          </div>
        </div>
      ) : scrollable ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-thin">
          {filled.map((m, i) => (
            <div key={i} className="shrink-0 w-[160px]">
              <MatchCard
                match={m}
                size={size}
                isPick={matchIsPick(m)}
                onClick={m && onMatchClick ? () => onMatchClick(m) : undefined}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-2 ${slots === 2 ? "grid-cols-2" : slots <= 8 ? "grid-cols-2" : "grid-cols-2"}`}>
          {filled.map((m, i) => (
            <MatchCard
              key={i}
              match={m}
              size={size}
              isPick={matchIsPick(m)}
              onClick={m && onMatchClick ? () => onMatchClick(m) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectorLine() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-4 bg-gradient-to-b from-amber-500/40 to-primary/30" />
    </div>
  );
}

function BracketColumn({
  title,
  matches,
  slots,
  onMatchClick,
  pickTeam,
  highlight = false,
}: {
  title: string;
  matches: BracketMatch[];
  slots: number;
  onMatchClick?: (m: BracketMatch) => void;
  pickTeam?: string | null;
  highlight?: boolean;
}) {
  const filled: (BracketMatch | null)[] = Array.from({ length: slots }, (_, i) => matches[i] || null);
  const matchIsPick = (m: BracketMatch | null) => {
    if (!m || !pickTeam) return false;
    const p = pickTeam.toLowerCase();
    return m.home.name?.toLowerCase() === p || m.away.name?.toLowerCase() === p;
  };
  // Each subsequent round doubles vertical gap so pairs visually feed into next round
  const gapClass =
    slots >= 16 ? "gap-2"
    : slots === 8 ? "gap-8"
    : slots === 4 ? "gap-20"
    : slots === 2 ? "gap-44"
    : "";

  return (
    <div className="flex flex-col w-[200px] shrink-0">
      <div className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-2 ${highlight ? "text-amber-400" : "text-muted-foreground"}`}>
        {title} <span className="text-muted-foreground/60 font-normal">({matches.length}/{slots})</span>
      </div>
      <div className={`flex flex-col justify-around flex-1 ${gapClass} border-l border-border/20 pl-2 relative`}>
        {filled.map((m, i) => (
          <div key={i} className="relative">
            {/* horizontal connector to next round */}
            <div className="absolute right-0 top-1/2 -translate-y-px w-2 h-px bg-border/30 translate-x-full" />
            <MatchCard
              match={m}
              size="sm"
              isPick={matchIsPick(m)}
              onClick={m && onMatchClick ? () => onMatchClick(m) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorldCupBracket({ onGoToGroups }: { onGoToGroups?: () => void }) {
  const { bracket, hasData, totalMatches, loading } = useWorldCupBracket();
  const { myPick } = useChampionPrediction();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const pickTeam = myPick?.has_vote ? myPick.team_name ?? null : null;

  const handleMatchClick = (b: BracketMatch) => {
    const m = bracketToMatch(b);
    if (m) setSelectedMatch(m);
  };

  // Build "Path to Final" for user's champion pick
  const pickPath = useMemo(() => {
    if (!pickTeam || !hasData) return null;
    const lower = pickTeam.toLowerCase();
    const order: BracketRound[] = [
      "Round of 32",
      "Round of 16",
      "Quarter-finals",
      "Semi-finals",
      "Final",
    ];
    const steps: {
      round: BracketRound;
      shortLabel: string;
      match: BracketMatch | null;
      result: "win" | "loss" | "live" | "upcoming" | "none";
      opponent: string | null;
    }[] = [];
    let eliminated = false;
    for (const r of order) {
      const m = (bracket[r] ?? []).find(
        (x) => x.home.name?.toLowerCase() === lower || x.away.name?.toLowerCase() === lower
      );
      const shortLabel = r === "Round of 32" ? "R32" : r === "Round of 16" ? "R16" : r === "Quarter-finals" ? "QF" : r === "Semi-finals" ? "SF" : "🏆";
      if (!m) {
        steps.push({ round: r, shortLabel, match: null, result: eliminated ? "none" : "upcoming", opponent: null });
        continue;
      }
      const isHome = m.home.name?.toLowerCase() === lower;
      const opponent = isHome ? m.away.name : m.home.name;
      const finished = isFinished(m.status);
      const live = isLive(m.status);
      let result: "win" | "loss" | "live" | "upcoming" = "upcoming";
      if (live) result = "live";
      else if (finished) {
        const won = (isHome && m.winner === "home") || (!isHome && m.winner === "away");
        result = won ? "win" : "loss";
        if (!won) eliminated = true;
      }
      steps.push({ round: r, shortLabel, match: m, result, opponent: opponent ?? "TBD" });
    }
    return steps;
  }, [pickTeam, bracket, hasData]);

  if (loading) {
    return (
      <div className="space-y-2 px-3 mt-4 animate-pulse">
        <div className="h-32 bg-muted/30 rounded-xl" />
        <div className="h-20 bg-muted/30 rounded-xl" />
        <div className="h-20 bg-muted/30 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-3 mt-4 space-y-4">
      {/* Hero */}
      <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-fuchsia-500/10 p-4">
        <div className="absolute -top-8 -right-8 opacity-10">
          <Trophy className="h-32 w-32 text-amber-400" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="text-base font-bold text-foreground">Road to the Final</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">
            MetLife Stadium · East Rutherford, NJ
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            July 19, 2026
          </p>

          {!hasData ? (
            <div className="mt-3 p-2.5 rounded-lg bg-background/40 border border-border/40">
              <p className="text-[11px] text-foreground font-semibold mb-0.5">
                🔓 Bracket unlocks after Group Stage
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">
                Knockout fixtures will be auto-populated when group stage concludes (June 24).
              </p>
              {onGoToGroups && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  onClick={onGoToGroups}
                >
                  View Group Standings →
                </Button>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="mt-2 text-[10px] border-emerald-500/50 text-emerald-400">
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              {totalMatches} matches loaded · Live data
            </Badge>
          )}
        </div>
      </Card>

      {/* Path to Final — user's Champion Pick tracker */}
      {pickPath && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/8 via-card to-fuchsia-500/8 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-foreground">
              {teamFlag(pickTeam)} {pickTeam}'s Path to the Final
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
            {pickPath.map((s, i) => {
              const color =
                s.result === "win" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                : s.result === "loss" ? "border-red-500/50 bg-red-500/10 text-red-300 line-through"
                : s.result === "live" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 animate-pulse"
                : s.result === "upcoming" ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
                : "border-border/40 bg-muted/10 text-muted-foreground/60";
              const icon = s.result === "win" ? "✅" : s.result === "loss" ? "❌" : s.result === "live" ? "🔴" : "";
              return (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => s.match && handleMatchClick(s.match)}
                    disabled={!s.match}
                    className={`px-2 py-1 rounded-md border text-[10px] font-medium ${color} ${s.match ? "cursor-pointer hover:opacity-80" : "cursor-default"} transition-opacity`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{s.shortLabel}</span>
                      {s.opponent && (
                        <span className="opacity-80">vs {teamFlag(s.opponent)} {s.opponent.length > 8 ? s.opponent.slice(0, 7) + "…" : s.opponent}</span>
                      )}
                      {icon && <span>{icon}</span>}
                    </div>
                  </button>
                  {i < pickPath.length - 1 && <span className="text-muted-foreground/40 text-[10px]">→</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* DESKTOP: horizontal bracket columns (md+) — always shown so structure is visible */}
      <div className="hidden md:block">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max items-stretch">
              <BracketColumn
                title="Round of 32"
                matches={bracket["Round of 32"]}
                slots={16}
                onMatchClick={handleMatchClick}
                pickTeam={pickTeam}
              />
              <BracketColumn
                title="Round of 16"
                matches={bracket["Round of 16"]}
                slots={8}
                onMatchClick={handleMatchClick}
                pickTeam={pickTeam}
              />
              <BracketColumn
                title="Quarterfinals"
                matches={bracket["Quarter-finals"]}
                slots={4}
                onMatchClick={handleMatchClick}
                pickTeam={pickTeam}
              />
              <BracketColumn
                title="Semifinals"
                matches={bracket["Semi-finals"]}
                slots={2}
                onMatchClick={handleMatchClick}
                pickTeam={pickTeam}
              />
              <BracketColumn
                title="🏆 Final"
                matches={bracket.Final}
                slots={1}
                onMatchClick={handleMatchClick}
                pickTeam={pickTeam}
                highlight
              />
            </div>
          </div>
      </div>

      {/* MOBILE: reverse pyramid (existing) */}
      <div className="md:hidden space-y-4">
      {/* Reverse pyramid: Final at top, R32 at bottom */}
      <RoundSection
        title="🏆 Final"
        matches={bracket.Final}
        slots={ROUND_SLOTS.Final}
        size="lg"
        highlight
        onMatchClick={handleMatchClick}
        pickTeam={pickTeam}
      />

      <ConnectorLine />

      <RoundSection
        title="Semifinals"
        matches={bracket["Semi-finals"]}
        slots={ROUND_SLOTS["Semi-finals"]}
        size="md"
        onMatchClick={handleMatchClick}
        pickTeam={pickTeam}
      />

      <ConnectorLine />

      <RoundSection
        title="Quarterfinals"
        matches={bracket["Quarter-finals"]}
        slots={ROUND_SLOTS["Quarter-finals"]}
        size="md"
        onMatchClick={handleMatchClick}
        pickTeam={pickTeam}
      />

      <ConnectorLine />

      <RoundSection
        title="Round of 16"
        matches={bracket["Round of 16"]}
        slots={ROUND_SLOTS["Round of 16"]}
        size="sm"
        scrollable
        onMatchClick={handleMatchClick}
        pickTeam={pickTeam}
      />

      <ConnectorLine />

      <RoundSection
        title="Round of 32"
        matches={bracket["Round of 32"]}
        slots={ROUND_SLOTS["Round of 32"]}
        size="sm"
        onMatchClick={handleMatchClick}
        pickTeam={pickTeam}
      />

      {/* Third Place (only if exists) */}
      {bracket["3rd Place Final"]?.length > 0 && (
        <>
          <div className="border-t border-border/30 pt-3 mt-2">
            <RoundSection
              title="🥉 Third Place"
              matches={bracket["3rd Place Final"]}
              slots={1}
              size="md"
              onMatchClick={handleMatchClick}
              pickTeam={pickTeam}
            />
          </div>
        </>
      )}
      </div>

      <p className="text-center text-[9px] text-muted-foreground/70 pt-2 pb-4">
        Auto-updated from official FIFA fixtures · Refreshes every 5 minutes
      </p>

      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}