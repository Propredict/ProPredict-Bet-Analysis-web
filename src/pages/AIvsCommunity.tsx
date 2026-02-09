import { Helmet } from "react-helmet-async";
import { Swords, Brain, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchDuelCard } from "@/components/ai-vs-community/MatchDuelCard";
import { GamificationPanel } from "@/components/ai-vs-community/GamificationPanel";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useArenaStats } from "@/hooks/useArenaStats";
import { useArenaDailyCount } from "@/hooks/useArenaDailyCount";

const TOP_LEAGUES = [
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "champions league",
  "europa league",
];

/** Check if a match kickoff is still in the future (with 5-min buffer) */
function isUpcoming(p: { match_date: string | null; match_time: string | null }): boolean {
  if (!p.match_date || !p.match_time) return true; // no time info → treat as upcoming
  const [y, mo, d] = p.match_date.split("-").map(Number);
  const [h, m] = p.match_time.split(":").map(Number);
  const kickoff = new Date(y, mo - 1, d, h, m);
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return kickoff.getTime() > Date.now() + bufferMs;
}

function curateMatches(predictions: ReturnType<typeof useAIPredictions>["predictions"]) {
  const isTopLeague = (league: string) =>
    TOP_LEAGUES.some((l) => league.toLowerCase().includes(l)) &&
    !league.toLowerCase().includes("premier league 2");

  // Only show upcoming matches (kickoff > now + 5 min)
  const upcoming = predictions.filter((p) => isUpcoming(p));

  const isPending = (p: typeof predictions[0]) =>
    !p.result_status || p.result_status === "pending";

  const topPremium = upcoming.filter((p) =>
    p.league && isTopLeague(p.league) && isPending(p) && p.confidence >= 85
  ).sort((a, b) => b.confidence - a.confidence);

  const topPro = upcoming.filter((p) =>
    p.league && isTopLeague(p.league) && isPending(p) && p.confidence >= 65 && p.confidence < 85 &&
    !topPremium.some((pr) => pr.id === p.id)
  ).sort((a, b) => b.confidence - a.confidence);

  const allPremium = upcoming.filter((p) =>
    p.league && isPending(p) && p.confidence >= 85 &&
    !topPremium.some((pr) => pr.id === p.id)
  ).sort((a, b) => b.confidence - a.confidence);

  const allPro = upcoming.filter((p) =>
    p.league && isPending(p) && p.confidence >= 65 && p.confidence < 85 &&
    !topPro.some((pr) => pr.id === p.id) && !allPremium.some((pr) => pr.id === p.id)
  ).sort((a, b) => b.confidence - a.confidence);

  const leagueCount: Record<string, number> = {};
  const curated: typeof predictions = [];

  for (const pool of [topPremium, topPro, allPremium, allPro]) {
    for (const p of pool) {
      if (curated.length >= 8) break;
      if (curated.some((c) => c.id === p.id)) continue;
      const key = (p.league || "").toLowerCase();
      leagueCount[key] = (leagueCount[key] || 0) + 1;
      if (leagueCount[key] <= 2) {
        curated.push(p);
      }
    }
    if (curated.length >= 8) break;
  }

  return curated;
}

function getDailyLimit(tier: "free" | "pro" | "exclusive"): number {
  if (tier === "exclusive") return 10;
  if (tier === "pro") return 5;
  return 0;
}

export default function AIvsCommunity() {
  const { predictions: todayPredictions, loading: loadingToday } = useAIPredictions("today");
  const { predictions: tomorrowPredictions, loading: loadingTomorrow } = useAIPredictions("tomorrow");
  const { plan } = useUserPlan();
  const arenaStats = useArenaStats();
  const userTier: "free" | "pro" | "exclusive" = plan === "premium" ? "exclusive" : plan === "basic" ? "pro" : "free";
  const dailyLimit = getDailyLimit(userTier);
  const { dailyCount, increment } = useArenaDailyCount(arenaStats.seasonId);

  const loading = loadingToday || loadingTomorrow;

  // Curate from today (only upcoming). If none left, pull from tomorrow.
  const todayCurated = curateMatches(todayPredictions);
  const tomorrowCurated = curateMatches(tomorrowPredictions);

  // Always try to fill with upcoming matches
  const curated = todayCurated.length > 0
    ? todayCurated.length < 5
      ? [...todayCurated, ...tomorrowCurated].slice(0, 8)
      : todayCurated
    : tomorrowCurated;

  return (
    <>
      <Helmet>
        <title>AI vs Community – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Compare AI predictions with community analysis on top European football matches." />
      </Helmet>

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-primary">AI vs Community</h1>
              <p className="text-[9px] text-muted-foreground">Prediction Arena</p>
            </div>
          </div>
          {curated.length > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {curated.length} matches
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These matches are selected from today's AI predictions based on relevance and expected discussion.
          </p>
        </div>

        <GamificationPanel />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : curated.length > 0 ? (
          <div className="space-y-4">
            {curated.map((prediction) => (
              <MatchDuelCard
                key={prediction.id}
                prediction={prediction}
                userTier={userTier}
                seasonId={arenaStats.seasonId}
                dailyUsed={dailyCount}
                dailyLimit={dailyLimit}
                onPredictionMade={increment}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Brain className="h-8 w-8 text-primary/40" />
            <p className="text-sm text-muted-foreground">No arena matches available today</p>
            <p className="text-[10px] text-muted-foreground">Check back later for curated predictions from top European leagues.</p>
          </div>
        )}
      </div>
    </>
  );
}
