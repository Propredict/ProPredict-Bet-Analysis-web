import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, Crown, Flame, Loader2, Lock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTips } from "@/hooks/useTips";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { AffiliateBanner1xBet } from "./AffiliateBanner1xBet";

function todayBelgrade() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

interface Row {
  id: string;
  home: string;
  away: string;
  league: string;
  prediction: string;
  confidence: number;
  tier: ContentTier;
  kickoff: string;
  category: string;
}

function mapTip(t: any): Row {
  return {
    id: t.id,
    home: t.home_team,
    away: t.away_team,
    league: t.league ?? "",
    prediction: t.prediction ?? "",
    confidence: t.confidence ?? 0,
    tier: (t.tier ?? "free") as ContentTier,
    kickoff: t.kickoff_time ? String(t.kickoff_time).slice(0, 5) : "",
    category: t.category ?? "",
  };
}

function PredictionRow({ row, locked }: { row: Row; locked: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0 sm:px-4">
      <span className="hidden w-12 shrink-0 text-xs font-bold text-muted-foreground sm:inline">{row.kickoff}</span>
      <span className="hidden w-28 shrink-0 truncate text-xs text-muted-foreground lg:inline">{row.league}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase text-sidebar">
        {row.home} <span className="text-muted-foreground">vs</span> {row.away}
      </span>
      {locked ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
          <Lock className="h-3 w-3" /> Locked
        </span>
      ) : (
        <span className="shrink-0 rounded-md border border-success/50 bg-success/10 px-2 py-1 text-[11px] font-extrabold text-success sm:text-xs">
          {row.prediction}
        </span>
      )}
      {row.confidence > 0 && (
        <span className="hidden shrink-0 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-primary sm:inline">
          {row.confidence}%
        </span>
      )}
    </div>
  );
}

const premiumBenefits = [
  "Premium daily picks (85%+ confidence)",
  "Sure Odds 2+ tickets",
  "Early access to predictions",
  "No ads",
  "Higher winning chances",
];

export function DashboardOverview() {
  const tipsQuery = useTips(false);
  const { tips: dbTips = [], isLoading } = tipsQuery ?? ({} as any);
  const { canAccess } = useUserPlan();
  const { matches } = useLiveScores({ dateMode: "today", statusFilter: "all" });

  const today = todayBelgrade();
  const todays = (dbTips as any[]).filter((t) => t.tip_date === today).map(mapTip);
  const sorted = [...todays].sort((a, b) => b.confidence - a.confidence);
  const topRows = sorted.slice(0, 5);
  const tipRows = sorted.filter((r) => r.category !== "risk_of_day").slice(0, 4);
  const riskRows = sorted.filter((r) => r.category === "risk_of_day").slice(0, 4);

  const liveMatches = matches
    .filter((m) => m.status === "live" || m.status === "halftime")
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      {/* LEFT: Top predictions + live/tips row */}
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="text-base font-black text-sidebar sm:text-lg">Today's Top Predictions</h2>
            </div>
            <Link to="/single-tips" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : topRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No predictions published yet today.</p>
          ) : (
            topRows.map((row) => (
              <PredictionRow key={row.id} row={row} locked={!canAccess(row.tier, "tip", row.id)} />
            ))
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Live matches */}
          <section className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <h2 className="text-base font-black text-sidebar">Live Matches</h2>
              </div>
              <Link to="/live-scores" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {liveMatches.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No live matches right now.</p>
            ) : (
              liveMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                  <span className="w-9 shrink-0 text-[11px] font-bold text-primary">{m.minute ? `${m.minute}'` : "HT"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-sidebar">{m.homeTeam}</span>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-sm font-black text-sidebar">
                    {m.homeScore ?? 0} - {m.awayScore ?? 0}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-sidebar">{m.awayTeam}</span>
                </div>
              ))
            )}
          </section>

          {/* Today's tips */}
          <section className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                <h2 className="text-base font-black text-sidebar">Today's Tips</h2>
              </div>
              <Link to="/single-tips" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {tipRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Tips are being prepared.</p>
            ) : (
              tipRows.map((row) => {
                const locked = !canAccess(row.tier, "tip", row.id);
                return (
                  <div key={row.id} className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold uppercase text-sidebar">{row.home} vs {row.away}</p>
                      {locked ? (
                        <p className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Lock className="h-3 w-3" /> Premium pick</p>
                      ) : (
                        <p className="text-xs font-bold text-success">{row.prediction}</p>
                      )}
                    </div>
                    {row.confidence > 0 && (
                      <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-primary">{row.confidence}%</span>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* Risk of the Day */}
          <section className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md md:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <h2 className="text-base font-black text-sidebar">Risk of the Day</h2>
              </div>
              <Link to="/single-tips?view=risk" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {riskRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Risk pick is being prepared.</p>
            ) : (
              riskRows.map((row) => {
                const locked = !canAccess(row.tier, "tip", row.id);
                return (
                  <div key={row.id} className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold uppercase text-sidebar">{row.home} vs {row.away}</p>
                      {locked ? (
                        <p className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Lock className="h-3 w-3" /> Premium pick</p>
                      ) : (
                        <p className="text-xs font-bold text-success">{row.prediction}</p>
                      )}
                    </div>
                    {row.confidence > 0 && (
                      <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-primary">{row.confidence}%</span>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>

      {/* RIGHT: Go premium + sponsor */}
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary via-blue-600 to-sidebar p-5 shadow-lg shadow-primary/25">
          <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[24px] border-primary-foreground/10" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-black text-primary-foreground">Go Premium</h2>
            </div>
            <p className="mt-2 text-sm font-medium text-primary-foreground/85">
              Get access to our exclusive predictions, tickets and high confidence picks.
            </p>
            <ul className="mt-4 space-y-2">
              {premiumBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm font-semibold text-primary-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              to="/get-premium"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-black text-primary shadow-md transition-transform hover:-translate-y-0.5"
            >
              Get Premium Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <AffiliateBanner1xBet />
      </div>
    </div>
  );
}

export default DashboardOverview;
