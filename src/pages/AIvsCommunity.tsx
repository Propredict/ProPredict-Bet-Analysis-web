import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Swords, Brain, Loader2, Info, HelpCircle, CircleHelp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MatchDuelCard } from "@/components/ai-vs-community/MatchDuelCard";
import { GamificationPanel } from "@/components/ai-vs-community/GamificationPanel";
import { ArenaResults } from "@/components/ai-vs-community/ArenaResults";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useArenaStats } from "@/hooks/useArenaStats";
import { useArenaDailyCount } from "@/hooks/useArenaDailyCount";

/** Priority leagues with target quotas (filled first, in order) */
const PRIORITY_LEAGUES: { pattern: string; exclude?: string[]; max: number }[] = [
  { pattern: "premier league", exclude: ["premier league 2", "sudan"], max: 3 },
  { pattern: "championship", exclude: ["championship 2"], max: 2 },
  { pattern: "la liga", max: 2 },
  { pattern: "serie a", exclude: ["serie a2"], max: 2 },
  { pattern: "bundesliga", max: 2 },
  { pattern: "primeira liga", max: 2 },
  { pattern: "champions league", max: 2 },
  { pattern: "europa league", max: 2 },
];

const EXCLUDED_PATTERNS = ["premier league 2", "u21", "u23", "women", "reserve", "sudan", "youth"];

const MAX_ARENA_MATCHES = 10;

/** Check if a match kickoff is still in the future (with 5-min buffer) */
function isUpcoming(p: { match_date: string | null; match_time: string | null }): boolean {
  if (!p.match_date || !p.match_time) return true;
  const [y, mo, d] = p.match_date.split("-").map(Number);
  const [h, m] = p.match_time.split(":").map(Number);
  const kickoff = new Date(y, mo - 1, d, h, m);
  const bufferMs = 5 * 60 * 1000;
  return kickoff.getTime() > Date.now() + bufferMs;
}

function matchesPriority(league: string, entry: typeof PRIORITY_LEAGUES[0]): boolean {
  const l = league.toLowerCase();
  if (!l.includes(entry.pattern)) return false;
  if (entry.exclude?.some((ex) => l.includes(ex))) return false;
  return true;
}

function isExcluded(league: string): boolean {
  return EXCLUDED_PATTERNS.some((ex) => league.toLowerCase().includes(ex));
}

function curateMatches(predictions: ReturnType<typeof useAIPredictions>["predictions"]) {
  const upcoming = predictions.filter(
    (p) => isUpcoming(p) && p.league && !isExcluded(p.league) && (!p.result_status || p.result_status === "pending")
  );

  const curated: typeof predictions = [];
  const used = new Set<string>();

  // Phase 1: Fill priority leagues in order
  for (const entry of PRIORITY_LEAGUES) {
    const pool = upcoming
      .filter((p) => matchesPriority(p.league!, entry) && !used.has(p.id))
      .sort((a, b) => b.confidence - a.confidence);

    let added = 0;
    for (const p of pool) {
      if (curated.length >= MAX_ARENA_MATCHES || added >= entry.max) break;
      curated.push(p);
      used.add(p.id);
      added++;
    }
  }

  // Phase 2: Fill remaining slots with other leagues (max 2 per league)
  if (curated.length < MAX_ARENA_MATCHES) {
    const leagueCount: Record<string, number> = {};
    const others = upcoming
      .filter((p) => !used.has(p.id))
      .sort((a, b) => b.confidence - a.confidence);

    for (const p of others) {
      if (curated.length >= MAX_ARENA_MATCHES) break;
      const key = (p.league || "").toLowerCase();
      leagueCount[key] = (leagueCount[key] || 0) + 1;
      if (leagueCount[key] <= 2) {
        curated.push(p);
        used.add(p.id);
      }
    }
  }

  return curated;
}

function getDailyLimit(tier: "free" | "pro" | "exclusive"): number {
  if (tier === "exclusive") return 10;
  if (tier === "pro") return 5;
  return 0;
}

export default function AIvsCommunity() {
  const { predictions: todayPredictions, loading: loadingToday, refetch: refetchToday } = useAIPredictions("today");
  const { predictions: tomorrowPredictions, loading: loadingTomorrow, refetch: refetchTomorrow } = useAIPredictions("tomorrow");

  // Auto-refresh every 10 minutes to rotate out started matches
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      refetchToday();
      refetchTomorrow();
      setTick((t) => t + 1); // force re-evaluation of isUpcoming filters
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetchToday, refetchTomorrow]);
  const { plan } = useUserPlan();
  const arenaStats = useArenaStats();
  const userTier: "free" | "pro" | "exclusive" = plan === "premium" ? "exclusive" : plan === "basic" ? "pro" : "free";
  const dailyLimit = getDailyLimit(userTier);
  const { dailyCount, increment } = useArenaDailyCount(arenaStats.seasonId);

  const [activeTab, setActiveTab] = useState("upcoming");
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
        <title>AI vs Members – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Compare AI predictions with community analysis on top European football matches." />
      </Helmet>

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-primary">AI vs Members</h1>
              <p className="text-[9px] text-muted-foreground">Prediction Arena</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {curated.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {curated.length} matches
              </Badge>
            )}
            <Link
              to="/how-ai-vs-members-works#faq"
              className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/20 hover:bg-primary/30 transition-colors"
              title="FAQ"
            >
              <CircleHelp className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40">
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              These matches are selected from today's AI predictions based on relevance and expected discussion.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[9px] text-foreground font-medium">Check the instructions</span>
            <Link
              to="/how-ai-vs-members-works"
              className="flex items-center gap-1.5 shrink-0 text-xs text-primary-foreground bg-primary/90 hover:bg-primary px-3 py-1.5 rounded-md font-medium transition-colors shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>How it works</span>
            </Link>
          </div>
        </div>

        <GamificationPanel />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
            <TabsTrigger value="my-predictions" className="text-xs">My Predictions vs AI</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-3">
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
                    onViewMyPredictions={() => setActiveTab("my-predictions")}
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
          </TabsContent>

          <TabsContent value="my-predictions" className="mt-3">
            <ArenaResults />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
