import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Radio, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWCTodayFixtures } from "@/hooks/useWCTodayFixtures";
import { formatMatchTime } from "@/utils/formatMatchTime";
import heroImage from "@/assets/world-cup-hero.jpg";

export function DashboardWorldCup() {
  const { data } = useWCTodayFixtures();
  const fixtures = data?.fixtures ?? [];
  const live = fixtures.filter((f) => f.status === "live" || f.status === "halftime");
  const upcoming = fixtures.filter((f) => f.status === "upcoming");
  const finished = fixtures.filter((f) => f.status === "finished");
  const preview = [...live, ...upcoming, ...finished].slice(0, 3);

  return (
    <Link
      to="/world-cup-2026?tab=matches"
      className="group block rounded-2xl overflow-hidden border border-primary/30 bg-card shadow-[0_0_25px_rgba(15,155,142,0.18)] hover:border-primary/60 transition-all"
      aria-label="Open World Cup 2026 matches"
    >
      {/* Hero header */}
      <div className="relative h-28 sm:h-32 overflow-hidden">
        <img
          src={heroImage}
          alt="FIFA World Cup 2026"
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30" />
        <div className="relative h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 border border-primary/40">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                FIFA World Cup 2026
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {live.length > 0
                  ? `${live.length} live now · ${fixtures.length} matches today`
                  : fixtures.length > 0
                  ? `${fixtures.length} matches today`
                  : "Live scores · brackets · AI predictions"}
              </p>
            </div>
          </div>
          {live.length > 0 && (
            <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px] px-2 py-0.5 gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
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
        ) : (
          <p className="text-[11px] text-muted-foreground text-center py-2">
            Tap to view full schedule, brackets and AI predictions.
          </p>
        )}

        <div className="flex items-center justify-center pt-1">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
            View all matches
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}