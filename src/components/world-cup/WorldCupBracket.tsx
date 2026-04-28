import { Trophy, Lock, Calendar, MapPin, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorldCupBracket, type BracketMatch, type BracketRound } from "@/hooks/useWorldCupBracket";

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
}: {
  match: BracketMatch | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
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
          {/* Home team */}
          <div
            className={`flex items-center justify-between gap-2 ${
              finished && match!.winner === "away" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
}: {
  title: string;
  matches: BracketMatch[];
  slots: number;
  size?: "sm" | "md" | "lg";
  scrollable?: boolean;
  highlight?: boolean;
}) {
  const filled: (BracketMatch | null)[] = Array.from({ length: slots }, (_, i) => matches[i] || null);
  const filledCount = matches.length;

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
            <MatchCard match={filled[0]} size="lg" />
          </div>
        </div>
      ) : scrollable ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-thin">
          {filled.map((m, i) => (
            <div key={i} className="shrink-0 w-[160px]">
              <MatchCard match={m} size={size} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-2 ${slots === 2 ? "grid-cols-2" : slots <= 8 ? "grid-cols-2" : "grid-cols-2"}`}>
          {filled.map((m, i) => (
            <MatchCard key={i} match={m} size={size} />
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

export default function WorldCupBracket({ onGoToGroups }: { onGoToGroups?: () => void }) {
  const { bracket, hasData, totalMatches, loading } = useWorldCupBracket();

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

      {/* Reverse pyramid: Final at top, R32 at bottom */}
      <RoundSection
        title="🏆 Final"
        matches={bracket.Final}
        slots={ROUND_SLOTS.Final}
        size="lg"
        highlight
      />

      <ConnectorLine />

      <RoundSection
        title="Semifinals"
        matches={bracket["Semi-finals"]}
        slots={ROUND_SLOTS["Semi-finals"]}
        size="md"
      />

      <ConnectorLine />

      <RoundSection
        title="Quarterfinals"
        matches={bracket["Quarter-finals"]}
        slots={ROUND_SLOTS["Quarter-finals"]}
        size="md"
      />

      <ConnectorLine />

      <RoundSection
        title="Round of 16"
        matches={bracket["Round of 16"]}
        slots={ROUND_SLOTS["Round of 16"]}
        size="sm"
        scrollable
      />

      <ConnectorLine />

      <RoundSection
        title="Round of 32"
        matches={bracket["Round of 32"]}
        slots={ROUND_SLOTS["Round of 32"]}
        size="sm"
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
            />
          </div>
        </>
      )}

      <p className="text-center text-[9px] text-muted-foreground/70 pt-2 pb-4">
        Auto-updated from official FIFA fixtures · Refreshes every 5 minutes
      </p>
    </div>
  );
}