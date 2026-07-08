import { Link } from "react-router-dom";
import { Trophy, Radio, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWCTodayFixtures } from "@/hooks/useWCTodayFixtures";
import { useWorldCupBracket } from "@/hooks/useWorldCupBracket";
import { formatMatchTime } from "@/utils/formatMatchTime";
import TeamFlag from "@/components/world-cup/TeamFlag";
import { TEAMS } from "@/data/worldCup2026";
import heroImage from "@/assets/world-cup-hero.jpg";

export function DashboardWorldCup() {
  const { data } = useWCTodayFixtures();
  const { bracket } = useWorldCupBracket();
  const fixtures = data?.fixtures ?? [];
  const live = fixtures.filter((f) => f.status === "live" || f.status === "halftime");
  const upcoming = fixtures.filter((f) => f.status === "upcoming");
  const finished = fixtures.filter((f) => f.status === "finished");
  const preview = [...live, ...upcoming, ...finished].slice(0, 3);

  // Next upcoming knockout match across the whole bracket (not just today)
  const nextBracketMatch = (() => {
    const finishedStatuses = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
    const all = Object.values(bracket ?? {})
      .flat()
      .filter((m) => m.date && !finishedStatuses.has(m.status))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return all[0] ?? null;
  })();

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/30 bg-card shadow-[0_0_25px_rgba(15,155,142,0.18)]">
      <Link
        to="/world-cup-2026?tab=matches"
        className="group block"
        aria-label="Open World Cup 2026 matches"
      >
        {/* Hero header */}
        <div className="relative h-48 sm:h-56 overflow-hidden">
          <img
            src={heroImage}
            alt="FIFA World Cup 2026"
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/90" />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-4 gap-2">
            {live.length > 0 && (
              <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px] px-2 py-0.5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                {live.length} LIVE NOW
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-primary drop-shadow-[0_0_10px_rgba(15,155,142,0.6)]" />
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight uppercase [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">
                FIFA World Cup
              </h2>
            </div>
            <p className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent leading-none drop-shadow-[0_0_15px_rgba(15,155,142,0.5)]">
              2026
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-[0.18em]">
              {live.length > 0
                ? `${live.length} live · ${fixtures.length} matches today`
                : fixtures.length > 0
                ? `${fixtures.length} matches today · brackets · AI picks`
                : "Live scores · brackets · AI predictions"}
            </p>
            {nextBracketMatch && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-xl font-black text-foreground drop-shadow-[0_0_10px_rgba(15,155,142,0.6)]">
                  <span className="flex items-center gap-1.5">
                    {TEAMS[nextBracketMatch.home.name || ""] && <TeamFlag code={TEAMS[nextBracketMatch.home.name || ""].code} size="sm" />}
                    {nextBracketMatch.home.name || "TBD"}
                  </span>
                  <span className="text-primary">vs</span>
                  <span className="flex items-center gap-1.5">
                    {nextBracketMatch.away.name || "TBD"}
                    {TEAMS[nextBracketMatch.away.name || ""] && <TeamFlag code={TEAMS[nextBracketMatch.away.name || ""].code} size="sm" />}
                  </span>
                </div>
                {nextBracketMatch.date && (
                  <p className="text-[11px] sm:text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                    {new Date(nextBracketMatch.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Belgrade" })} · {formatMatchTime(nextBracketMatch.date)} CET
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Match preview rows */}
        <div className="p-3 space-y-2">
          {preview.length > 0 ? (
            preview.map((f) => {
              const isLive = f.status === "live" || f.status === "halftime";
              const isFinished = f.status === "finished";
              const hasScore = f.homeScore !== null && f.awayScore !== null;
              return (
                <div
                  key={f.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                    isLive ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
                  }`}
                >
                  <div className="shrink-0 w-12 flex justify-center">
                    {isLive ? (
                      <Badge className="bg-destructive text-destructive-foreground border-0 text-[9px] px-1.5 py-0 h-4 gap-1">
                        <Radio className="h-2.5 w-2.5" />
                        {f.status === "halftime" ? "HT" : `${f.minute ?? 0}'`}
                      </Badge>
                    ) : isFinished ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> FT
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {f.startTime ? formatMatchTime(f.startTime) : "TBD"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="flex-1 text-xs font-medium text-foreground truncate text-right">
                      {f.homeTeam}
                    </span>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${isLive ? "text-destructive" : "text-foreground"}`}>
                      {hasScore ? `${f.homeScore} - ${f.awayScore}` : "vs"}
                    </span>
                    <span className="flex-1 text-xs font-medium text-foreground truncate">
                      {f.awayTeam}
                    </span>
                  </div>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Footer CTA */}
        <div className="px-4 pb-4 pt-1 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground text-center">
            Tap to view full schedule, brackets and AI predictions.
          </p>
          <div className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors">
            VIEW ALL MATCHES
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </Link>

    </div>
  );
}