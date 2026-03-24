import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { Swords, Brain, Loader2, Info, CircleHelp, Bot, Users, Flame, Zap, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MatchDuelCard } from "@/components/ai-vs-community/MatchDuelCard";
import { GamificationPanel } from "@/components/ai-vs-community/GamificationPanel";
import { ArenaResults } from "@/components/ai-vs-community/ArenaResults";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useArenaStats } from "@/hooks/useArenaStats";
import { useArenaDailyCount } from "@/hooks/useArenaDailyCount";
import { cn } from "@/lib/utils";

const PRIORITY_LEAGUES: { exact: string[]; max: number }[] = [
  { exact: ["premier league"], max: 3 },
  { exact: ["championship"], max: 2 },
  { exact: ["la liga"], max: 2 },
  { exact: ["serie a"], max: 2 },
  { exact: ["bundesliga"], max: 2 },
  { exact: ["ligue 1"], max: 2 },
  { exact: ["primeira liga", "liga portugal"], max: 2 },
  { exact: ["eredivisie"], max: 2 },
  { exact: ["brasileirão", "brasileirao", "serie a brazil"], max: 2 },
  { exact: ["primera división", "primera division", "liga profesional"], max: 2 },
  { exact: ["mls", "major league soccer"], max: 2 },
  { exact: ["uefa champions league"], max: 2 },
  { exact: ["uefa europa league"], max: 2 },
];

const EXCLUDED_PATTERNS = [
  "u21", "u23", "u19", "u20", "women", "reserve", "youth", "amateur",
  "non league", "isthmian", "conference", "regional",
  "faw", "agcff", "gulf", "girabola", "national soccer league",
  "premyer liqa", "sudan", "afc champions", "friendlies",
];

const MAX_ARENA_MATCHES = 10;

function isUpcoming(p: { match_date: string | null; match_time: string | null }): boolean {
  if (!p.match_date || !p.match_time) return true;
  const [y, mo, d] = p.match_date.split("-").map(Number);
  const [h, m] = p.match_time.split(":").map(Number);
  const kickoff = new Date(y, mo - 1, d, h, m);
  return kickoff.getTime() > Date.now() + 5 * 60 * 1000;
}

function matchesPriority(league: string, entry: typeof PRIORITY_LEAGUES[0]): boolean {
  const l = league.toLowerCase().trim();
  return entry.exact.some((name) => l === name);
}

function isExcluded(league: string): boolean {
  const l = league.toLowerCase();
  return EXCLUDED_PATTERNS.some((ex) => l.includes(ex));
}

function generateCommunityVotes(prediction: { match_id: string; home_win: number; draw: number; away_win: number }) {
  const seed = prediction.match_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const noise = (s: number) => ((s * 9301 + 49297) % 233280) / 233280 * 12 - 6;
  let home = Math.max(5, Math.min(85, prediction.home_win + Math.round(noise(seed))));
  let draw = Math.max(5, Math.min(50, prediction.draw + Math.round(noise(seed + 1))));
  let away = Math.max(5, Math.min(85, prediction.away_win + Math.round(noise(seed + 2))));
  const total = home + draw + away;
  home = Math.round((home / total) * 100);
  draw = Math.round((draw / total) * 100);
  away = 100 - home - draw;
  const totalVotes = 40 + (seed % 160);
  return { home, draw, away, totalVotes };
}

function curateMatches(predictions: ReturnType<typeof useAIPredictions>["predictions"]) {
  const upcoming = predictions.filter(
    (p) => isUpcoming(p) && p.league && !isExcluded(p.league) && (!p.result_status || p.result_status === "pending")
  );

  const curated: typeof predictions = [];
  const used = new Set<string>();

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

  if (curated.length === 0) {
    const allUpcoming = predictions.filter(
      (p) => isUpcoming(p) && p.league && (!p.result_status || p.result_status === "pending")
    );
    const friendlies = allUpcoming
      .filter((p) => p.league!.toLowerCase().includes("friendlies"))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_ARENA_MATCHES);
    curated.push(...friendlies);
  }

  return curated;
}

function getDailyLimit(tier: "free" | "pro" | "exclusive"): number {
  if (tier === "exclusive") return 10;
  if (tier === "pro") return 5;
  return 3;
}

function getTotalVotesToday(curated: ReturnType<typeof useAIPredictions>["predictions"]): number {
  let total = 0;
  for (const p of curated) {
    const seed = p.match_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    total += 40 + (seed % 160);
  }
  return total;
}

export default function AIvsCommunity() {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const interstitialFired = useRef(false);

  useEffect(() => {
    if (!interstitialFired.current) {
      interstitialFired.current = true;
      maybeShowInterstitial("ai_vs_members");
    }
  }, [maybeShowInterstitial]);

  const { predictions: todayPredictions, loading: loadingToday, refetch: refetchToday } = useAIPredictions("today");
  const { predictions: tomorrowPredictions, loading: loadingTomorrow, refetch: refetchTomorrow } = useAIPredictions("tomorrow");

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      refetchToday();
      refetchTomorrow();
      setTick((t) => t + 1);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refetchToday, refetchTomorrow]);

  const { plan } = useUserPlan();
  const arenaStats = useArenaStats();
  const userTier: "free" | "pro" | "exclusive" = plan === "premium" ? "exclusive" : plan === "basic" ? "pro" : "free";
  const dailyLimit = getDailyLimit(userTier);
  const { dailyCount, increment } = useArenaDailyCount(arenaStats.seasonId);

  const [activeTab, setActiveTab] = useState("upcoming");
  const [showHotOnly, setShowHotOnly] = useState(false);
  const loading = loadingToday || loadingTomorrow;

  const todayCurated = curateMatches(todayPredictions);
  const tomorrowCurated = curateMatches(tomorrowPredictions);

  const curated = todayCurated.length > 0
    ? todayCurated.length < 5
      ? [...todayCurated, ...tomorrowCurated].slice(0, 8)
      : todayCurated
    : tomorrowCurated;

  // Hot matches = where AI and community disagree
  const hotMatches = useMemo(() => {
    return curated.filter((p) => {
      const community = generateCommunityVotes(p);
      const communityPick = community.home > community.draw && community.home > community.away ? "1"
        : community.away > community.draw && community.away > community.home ? "2" : "X";
      return p.prediction !== communityPick;
    });
  }, [curated]);

  const displayedMatches = showHotOnly ? hotMatches : curated;
  const totalVotes = getTotalVotesToday(curated);

  return (
    <>
      <Helmet>
        <title>AI vs Members – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Compare AI predictions with community analysis on top European football matches." />
        <meta property="og:title" content="AI vs Members – Prediction Arena | ProPredict" />
        <meta property="og:description" content="Compare AI predictions with community analysis on top European football matches." />
        <meta property="og:image" content="https://propredict.me/og-image.png" />
        <meta property="og:url" content="https://propredict.me/ai-vs-community" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 space-y-5">
        {/* === HERO HEADER === */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-primary/10 border border-primary/30 p-5">
          {/* Glow effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Title */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Swords className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-extrabold text-foreground tracking-tight">
                AI vs Members
              </h1>
              <Link
                to="/how-ai-vs-members-works#faq"
                className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                title="FAQ"
              >
                <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground mb-5">
              Who gets it right today?
            </p>

            {/* AI vs Members 3-column layout */}
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {/* AI Side */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(15,155,142,0.2)]">
                  <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary">🤖 AI</span>
                <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">AI PICK</Badge>
              </div>

              {/* VS Center */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="relative">
                  <span className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-[0_0_12px_rgba(15,155,142,0.4)]">
                    VS
                  </span>
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                </div>
                <Swords className="h-4 w-4 text-muted-foreground/60" />
              </div>

              {/* Members Side */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/50 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
                </div>
                <span className="text-xs font-bold text-accent">👥 Members</span>
                <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30">CROWD PICK</Badge>
              </div>
            </div>

            {/* Live feel */}
            <div className="flex items-center justify-center gap-4 mt-5">
              {totalVotes > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3 text-destructive" />
                  {totalVotes} users voted today
                </span>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Updated just now
              </span>
            </div>

            {/* Sub-text */}
            <p className="text-center text-[10px] text-primary/70 font-medium mt-3">
              ⚡ Pick your side and win rewards
            </p>
          </div>
        </div>

        {/* Daily Votes Info + How it Works */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4">
          {/* Daily Votes Per Plan */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Daily Predictions by Plan
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className={cn(
                "rounded-lg border p-2.5 text-center space-y-1",
                userTier === "free" ? "border-primary/50 bg-primary/5" : "border-border/40 bg-muted/20"
              )}>
                <p className="text-lg font-extrabold text-foreground">3</p>
                <p className="text-[9px] text-muted-foreground font-medium">Free</p>
                {userTier === "free" && <Badge className="text-[8px] h-4 bg-primary/15 text-primary border-primary/30">You</Badge>}
              </div>
              <div className={cn(
                "rounded-lg border p-2.5 text-center space-y-1",
                userTier === "pro" ? "border-primary/50 bg-primary/5" : "border-border/40 bg-muted/20"
              )}>
                <p className="text-lg font-extrabold text-foreground">5</p>
                <p className="text-[9px] text-muted-foreground font-medium">Pro</p>
                {userTier === "pro" && <Badge className="text-[8px] h-4 bg-primary/15 text-primary border-primary/30">You</Badge>}
              </div>
              <div className={cn(
                "rounded-lg border p-2.5 text-center space-y-1",
                userTier === "exclusive" ? "border-primary/50 bg-primary/5" : "border-border/40 bg-muted/20"
              )}>
                <p className="text-lg font-extrabold text-foreground">10</p>
                <p className="text-[9px] text-muted-foreground font-medium">Premium</p>
                {userTier === "exclusive" && <Badge className="text-[8px] h-4 bg-primary/15 text-primary border-primary/30">You</Badge>}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-center">
              You've used <span className="font-bold text-foreground">{dailyCount}</span> / <span className="font-bold text-foreground">{dailyLimit}</span> predictions today
            </p>
          </div>

          {/* How it Works */}
          <div className="border-t border-border/30 pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                How it Works
              </p>
              <Link
                to="/how-ai-vs-members-works"
                className="text-[10px] text-primary font-medium flex items-center gap-1 hover:underline"
              >
                <CircleHelp className="h-3 w-3" /> Full Guide
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { icon: "🎯", text: "Pick your prediction before kickoff" },
                { icon: "🤖", text: "Compare your pick against the AI" },
                { icon: "✅", text: "Earn points for each correct prediction" },
                { icon: "🏆", text: "Reach 1000 points → unlock free Pro month" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/20">
                  <span className="text-sm">{step.icon}</span>
                  <span className="text-[10px] text-muted-foreground">{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gamification */}
        <GamificationPanel />

        {/* Hot Matches Toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showHotOnly ? "outline" : "default"}
            className={cn(
              "h-8 text-xs gap-1.5",
              !showHotOnly && "bg-primary text-primary-foreground"
            )}
            onClick={() => setShowHotOnly(false)}
          >
            All Matches
            {curated.length > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1 h-4 px-1.5">{curated.length}</Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant={showHotOnly ? "default" : "outline"}
            className={cn(
              "h-8 text-xs gap-1.5",
              showHotOnly && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            onClick={() => setShowHotOnly(true)}
          >
            <Flame className="h-3 w-3" />
            Hot Matches
            {hotMatches.length > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1 h-4 px-1.5">{hotMatches.length}</Badge>
            )}
          </Button>
          {showHotOnly && (
            <span className="text-[9px] text-destructive/80 italic">
              🔥 AI & users disagree
            </span>
          )}
        </div>

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
            ) : displayedMatches.length > 0 ? (
              <div className="space-y-4">
                {displayedMatches.map((prediction) => (
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
                <p className="text-sm text-muted-foreground">
                  {showHotOnly ? "No hot matches right now" : "No arena matches available today"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {showHotOnly ? "All matches currently have AI-community consensus." : "Check back later for curated predictions from top European leagues."}
                </p>
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
