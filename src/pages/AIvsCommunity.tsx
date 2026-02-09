import { Helmet } from "react-helmet-async";
import { Swords, Brain, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchDuelCard } from "@/components/ai-vs-community/MatchDuelCard";
import { GamificationPanel } from "@/components/ai-vs-community/GamificationPanel";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";

const TOP_LEAGUES = [
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "champions league",
  "europa league",
];

function curateMatches(predictions: ReturnType<typeof useAIPredictions>["predictions"]) {
  const isTopLeague = (league: string) =>
    TOP_LEAGUES.some((l) => league.toLowerCase().includes(l)) &&
    !league.toLowerCase().includes("premier league 2");

  const isPending = (p: typeof predictions[0]) =>
    !p.result_status || p.result_status === "pending";

  // Premium first (≥85%), then Pro (65-84%)
  const premium = predictions.filter((p) =>
    p.league && isTopLeague(p.league) && isPending(p) && p.confidence >= 85
  ).sort((a, b) => b.confidence - a.confidence);

  const pro = predictions.filter((p) =>
    p.league && isTopLeague(p.league) && isPending(p) && p.confidence >= 65 && p.confidence < 85 &&
    !premium.some((pr) => pr.id === p.id)
  ).sort((a, b) => b.confidence - a.confidence);

  // Fill from premium first, then backfill from pro. Max 2 per league.
  const leagueCount: Record<string, number> = {};
  const curated: typeof predictions = [];

  for (const pool of [premium, pro]) {
    for (const p of pool) {
      if (curated.length >= 8) break;
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

export default function AIvsCommunity() {
  const { predictions, loading } = useAIPredictions("today");
  const { plan } = useUserPlan();
  const userTier: "free" | "pro" | "exclusive" = plan === "premium" ? "exclusive" : plan === "basic" ? "pro" : "free";

  const curated = curateMatches(predictions);

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
              <MatchDuelCard key={prediction.id} prediction={prediction} userTier={userTier} />
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
