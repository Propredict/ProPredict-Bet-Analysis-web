import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Target, TrendingUp, Flame } from "lucide-react";
import { TeamSeasonStats } from "@/hooks/useTeamStats";

interface SeasonStatsTabProps {
  homeStats: TeamSeasonStats | null;
  awayStats: TeamSeasonStats | null;
  loading: boolean;
  homeTeam: string;
  awayTeam: string;
}

function StatRow({ label, homeVal, awayVal, bold = false }: { label: string; homeVal: string | number; awayVal: string | number; bold?: boolean }) {
  const homeNum = typeof homeVal === "number" ? homeVal : parseFloat(homeVal);
  const awayNum = typeof awayVal === "number" ? awayVal : parseFloat(awayVal);
  const homeWins = !isNaN(homeNum) && !isNaN(awayNum) && homeNum > awayNum;
  const awayWins = !isNaN(homeNum) && !isNaN(awayNum) && awayNum > homeNum;

  return (
    <div className={`grid grid-cols-3 py-1.5 px-3 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={`text-center ${homeWins ? "text-emerald-400 font-semibold" : "text-foreground/80"}`}>{homeVal}</span>
      <span className="text-center text-muted-foreground text-xs">{label}</span>
      <span className={`text-center ${awayWins ? "text-emerald-400 font-semibold" : "text-foreground/80"}`}>{awayVal}</span>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-y border-white/5">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  );
}

function ColumnHeaders({ homeTeam, awayTeam, homeLogo, awayLogo }: { homeTeam: string; awayTeam: string; homeLogo?: string; awayLogo?: string }) {
  return (
    <div className="grid grid-cols-3 py-3 px-3 border-b border-white/10">
      <div className="flex flex-col items-center gap-1">
        {homeLogo && <img src={homeLogo} alt="" className="w-6 h-6 object-contain" />}
        <span className="text-xs font-bold text-center uppercase truncate max-w-[100px]">{homeTeam}</span>
      </div>
      <div />
      <div className="flex flex-col items-center gap-1">
        {awayLogo && <img src={awayLogo} alt="" className="w-6 h-6 object-contain" />}
        <span className="text-xs font-bold text-center uppercase truncate max-w-[100px]">{awayTeam}</span>
      </div>
    </div>
  );
}

export function SeasonStatsTab({ homeStats, awayStats, loading, homeTeam, awayTeam }: SeasonStatsTabProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (!homeStats || !awayStats) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Season statistics not available for this match.
      </div>
    );
  }

  const h = homeStats;
  const a = awayStats;

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <ColumnHeaders
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeLogo={h.team?.logo}
        awayLogo={a.team?.logo}
      />

      {/* Form */}
      <div className="px-3 py-2 grid grid-cols-3 text-xs">
        <span className="text-center tracking-widest font-mono">
          {h.form.slice(-6).split("").map((c, i) => (
            <span key={i} className={c === "W" ? "text-emerald-400" : c === "L" ? "text-red-400" : "text-amber-400"}>{c}</span>
          ))}
        </span>
        <span className="text-center text-muted-foreground">Form</span>
        <span className="text-center tracking-widest font-mono">
          {a.form.slice(-6).split("").map((c, i) => (
            <span key={i} className={c === "W" ? "text-emerald-400" : c === "L" ? "text-red-400" : "text-amber-400"}>{c}</span>
          ))}
        </span>
      </div>

      {/* Fixtures */}
      <SectionHeader icon={<Shield className="h-3.5 w-3.5 text-primary" />} title="Fixtures" />
      <StatRow label="Games Played" homeVal={h.fixtures.played.total} awayVal={a.fixtures.played.total} bold />
      <StatRow label="Wins" homeVal={h.fixtures.wins.total} awayVal={a.fixtures.wins.total} />
      <StatRow label="Draws" homeVal={h.fixtures.draws.total} awayVal={a.fixtures.draws.total} />
      <StatRow label="Losses" homeVal={h.fixtures.losses.total} awayVal={a.fixtures.losses.total} />
      <StatRow label="Home Wins" homeVal={h.fixtures.wins.home} awayVal={a.fixtures.wins.home} />
      <StatRow label="Away Wins" homeVal={h.fixtures.wins.away} awayVal={a.fixtures.wins.away} />

      {/* Goals */}
      <SectionHeader icon={<Target className="h-3.5 w-3.5 text-primary" />} title="Goals" />
      <StatRow label="Goals For" homeVal={h.goals.for.total.total} awayVal={a.goals.for.total.total} bold />
      <StatRow label="Goals Against" homeVal={h.goals.against.total.total} awayVal={a.goals.against.total.total} bold />
      <StatRow label="GF Home" homeVal={h.goals.for.total.home} awayVal={a.goals.for.total.home} />
      <StatRow label="GF Away" homeVal={h.goals.for.total.away} awayVal={a.goals.for.total.away} />
      <StatRow label="GA Home" homeVal={h.goals.against.total.home} awayVal={a.goals.against.total.home} />
      <StatRow label="GA Away" homeVal={h.goals.against.total.away} awayVal={a.goals.against.total.away} />

      {/* Goals Average */}
      <SectionHeader icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} title="Goals Average" />
      <StatRow label="Avg GF" homeVal={h.goals.for.average.total} awayVal={a.goals.for.average.total} bold />
      <StatRow label="Avg GA" homeVal={h.goals.against.average.total} awayVal={a.goals.against.average.total} bold />
      <StatRow label="Avg GF Home" homeVal={h.goals.for.average.home} awayVal={a.goals.for.average.home} />
      <StatRow label="Avg GF Away" homeVal={h.goals.for.average.away} awayVal={a.goals.for.average.away} />
      <StatRow label="Avg GA Home" homeVal={h.goals.against.average.home} awayVal={a.goals.against.average.home} />
      <StatRow label="Avg GA Away" homeVal={h.goals.against.average.away} awayVal={a.goals.against.average.away} />

      {/* Defensive */}
      <SectionHeader icon={<Shield className="h-3.5 w-3.5 text-emerald-400" />} title="Defense & Scoring" />
      <StatRow label="Clean Sheets" homeVal={h.cleanSheet.total} awayVal={a.cleanSheet.total} bold />
      <StatRow label="CS Home" homeVal={h.cleanSheet.home} awayVal={a.cleanSheet.home} />
      <StatRow label="CS Away" homeVal={h.cleanSheet.away} awayVal={a.cleanSheet.away} />
      <StatRow label="Failed to Score" homeVal={h.failedToScore.total} awayVal={a.failedToScore.total} />
      <StatRow label="Penalties" homeVal={`${h.penalty.scored.total}/${h.penalty.scored.total + h.penalty.missed.total}`} awayVal={`${a.penalty.scored.total}/${a.penalty.scored.total + a.penalty.missed.total}`} />

      {/* Streaks */}
      <SectionHeader icon={<Flame className="h-3.5 w-3.5 text-amber-400" />} title="Biggest Streaks" />
      <StatRow label="Win Streak" homeVal={h.biggestStreak.wins} awayVal={a.biggestStreak.wins} />
      <StatRow label="Draw Streak" homeVal={h.biggestStreak.draws} awayVal={a.biggestStreak.draws} />
      <StatRow label="Loss Streak" homeVal={h.biggestStreak.losses} awayVal={a.biggestStreak.losses} />
      {(h.biggestWins.home || a.biggestWins.home) && (
        <StatRow label="Biggest Win" homeVal={h.biggestWins.home || h.biggestWins.away || "-"} awayVal={a.biggestWins.home || a.biggestWins.away || "-"} />
      )}
    </div>
  );
}
