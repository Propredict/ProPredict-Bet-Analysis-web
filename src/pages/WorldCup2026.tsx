import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Zap, Globe, Lock, Brain, Calendar, BarChart3, Users, Shield, MapPin, Smartphone, Eye, Play } from "lucide-react";
import CountdownTimer from "@/components/world-cup/CountdownTimer";
import { useWCStandings } from "@/hooks/useWCStandings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroImage from "@/assets/world-cup-hero.jpg";
import WorldCupTeamPage from "@/components/world-cup/WorldCupTeamPage";
import TeamFlag from "@/components/world-cup/TeamFlag";
import AppLockOverlay from "@/components/world-cup/AppLockOverlay";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import {
  GROUPS, TEAMS, GROUP_MATCHES, FEATURED_MATCH, KNOCKOUT_ROUNDS, getTeamGroup,
} from "@/data/worldCup2026";

const ALL_TEAMS = Object.entries(GROUPS).flatMap(([group, teams]) =>
  teams.map(team => ({ team, group }))
);

const openPlayStore = () => {
  if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
    (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
  } else {
    window.open("https://play.google.com/store/apps/details?id=com.propredict.app", "_blank");
  }
};

function getTodayBelgrade() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

function parseAdEventPayload(event: Event) {
  const raw = (event as MessageEvent).data ?? (event as CustomEvent).detail ?? null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { type: raw };
    }
  }

  return raw && typeof raw === "object" ? raw : null;
}

// Mock AI predictions based on real matchups
const AI_PREDICTIONS = GROUP_MATCHES.slice(0, 12).map(m => {
  const homeRank = TEAMS[m.home]?.fifaRank || 50;
  const awayRank = TEAMS[m.away]?.fifaRank || 50;
  const total = homeRank + awayRank;
  const homeWin = Math.round((1 - homeRank / total) * 80 + 10);
  const awayWin = Math.round((1 - awayRank / total) * 80 + 10);
  const draw = 100 - homeWin - awayWin;
  return {
    home: m.home, away: m.away, date: m.date,
    homeWin: Math.max(homeWin, 8), draw: Math.max(draw, 15), awayWin: Math.max(awayWin, 8),
    confidence: Math.min(85, Math.round(60 + Math.abs(homeRank - awayRank) * 0.3)),
  };
});

export default function WorldCup2026() {
  const navigate = useNavigate();
  const { plan, isAdmin } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const interstitialFired = useRef(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!interstitialFired.current) {
      interstitialFired.current = true;
      maybeShowInterstitial("world_cup_2026");
    }
  }, [maybeShowInterstitial]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [matchesFilter, setMatchesFilter] = useState<"md1" | "md2" | "md3">("md1");
  const [teamsSearch, setTeamsSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { data: liveStandings } = useWCStandings();
  const getWcUnlockKey = () => `propredict_wc2026_unlocked_${getTodayBelgrade()}`;
  const [adUnlockedToday, setAdUnlockedToday] = useState(() => {
    try {
      return localStorage.getItem(getWcUnlockKey()) === "true";
    } catch {
      return false;
    }
  });
  const [adLoading, setAdLoading] = useState(false);

  // Tier access helpers
  const isPro = plan === "basic" || plan === "premium" || isAdmin;
  const isPremium = plan === "premium" || isAdmin;
  const isApp = isAndroidApp;

  // For app: free users need to watch ad, pro gets basic, premium gets all
  // For web: keep existing rules (isPro / isPremium)
  const appCanSeeBasic = isApp ? (isPro || isPremium || adUnlockedToday) : isPro;
  const appCanSeeAdvanced = isPremium;

  useEffect(() => {
    if (!isApp) return;

    const markUnlocked = () => {
      setAdUnlockedToday(true);
      setAdLoading(false);
      try {
        localStorage.setItem(getWcUnlockKey(), "true");
      } catch {
        // ignore storage errors in webview
      }
    };

    const resetLoading = () => setAdLoading(false);

    const handleAdEvent = (event: Event) => {
      const data = parseAdEventPayload(event);
      const type = data?.type;

      if (type === "AD_UNLOCK_SUCCESS") {
        markUnlocked();
      }

      if (type === "AD_UNLOCK_CANCELLED" || type === "RESET_AD_BUTTON" || type === "AD_LOAD_FAILED") {
        resetLoading();
      }
    };

    window.addEventListener("message", handleAdEvent as EventListener);
    document.addEventListener("message", handleAdEvent as EventListener);
    window.addEventListener("AD_UNLOCK_SUCCESS", handleAdEvent as EventListener);
    window.addEventListener("AD_UNLOCK_CANCELLED", handleAdEvent as EventListener);
    window.addEventListener("RESET_AD_BUTTON", handleAdEvent as EventListener);
    window.addEventListener("AD_LOAD_FAILED", handleAdEvent as EventListener);

    return () => {
      window.removeEventListener("message", handleAdEvent as EventListener);
      document.removeEventListener("message", handleAdEvent as EventListener);
      window.removeEventListener("AD_UNLOCK_SUCCESS", handleAdEvent as EventListener);
      window.removeEventListener("AD_UNLOCK_CANCELLED", handleAdEvent as EventListener);
      window.removeEventListener("RESET_AD_BUTTON", handleAdEvent as EventListener);
      window.removeEventListener("AD_LOAD_FAILED", handleAdEvent as EventListener);
    };
  }, [isApp]);

  useEffect(() => {
    if (!adLoading) return;

    const timeout = window.setTimeout(() => {
      setAdLoading(false);
    }, 30_000);

    return () => window.clearTimeout(timeout);
  }, [adLoading]);

  // Watch ad handler for Android
  const handleWatchAd = useCallback(() => {
    if (adLoading) return;

    const android = (window as any).Android;
    const showRewardedAd = typeof android?.watchRewardedAd === "function"
      ? () => android.watchRewardedAd()
      : typeof android?.showRewardedAd === "function"
        ? () => android.showRewardedAd()
        : null;

    if (!showRewardedAd) {
      setAdLoading(false);
      return;
    }

    setAdLoading(true);
    showRewardedAd();
  }, [adLoading]);

  const filteredTeams = ALL_TEAMS.filter(t => t.team.toLowerCase().includes(teamsSearch.toLowerCase()));

  // Split matches by matchday (8 matches each for 12 groups × 2 matches)
  const matchesByDay = {
    md1: GROUP_MATCHES.slice(0, 24),
    md2: [] as typeof GROUP_MATCHES,  // Will be filled when schedule confirmed
    md3: [] as typeof GROUP_MATCHES,
  };

  // If a team is selected, show the team page
  if (selectedTeam) {
    return <WorldCupTeamPage team={selectedTeam} onBack={() => setSelectedTeam(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="World Cup 2026" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-end text-center px-4 pt-24 pb-6 min-h-[240px]">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-7 w-7 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">World Cup 2026</h1>
          </div>
          <p className="text-sm text-white/80 max-w-md leading-relaxed">
            June 11 – July 19 · 48 Teams · 16 Cities
          </p>
          <CountdownTimer />
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
              <Globe className="h-3 w-3 mr-1" /> USA · Mexico · Canada
            </Badge>
            <Badge variant="outline" className="border-primary/50 text-primary text-[10px]">48 Teams · 12 Groups</Badge>
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
              🔥 Live Updates + AI Predictions
            </Badge>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-card border-b border-border h-11 px-1 gap-0 overflow-x-auto flex-nowrap">
          {[
            { value: "overview", label: "Overview", icon: Trophy },
            { value: "predictions", label: "AI Picks", icon: Brain },
            { value: "matches", label: "Matches", icon: Calendar },
            { value: "standings", label: "Standings", icon: BarChart3 },
            { value: "teams", label: "Teams", icon: Users },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1 whitespace-nowrap">
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ==================== OVERVIEW ==================== */}
        <TabsContent value="overview" className="mt-0">
          {/* Groups */}
          <section className="px-3 mt-4">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> Group Stage
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(GROUPS).map(([group, teams]) => {
                const isExpanded = expandedGroup === group;
                return (
                  <Card key={group} className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
                    onClick={() => setExpandedGroup(isExpanded ? null : group)}>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-primary">Group {group}</span>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <div className="space-y-1">
                        {teams.map((t, idx) => {
                          const td = TEAMS[t];
                          return (
                            <div key={t} className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                              idx < 2 ? "bg-emerald-500/10 text-emerald-400" : idx === 3 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                            }`}>
                              <span className="truncate flex items-center gap-1">
                                {td && <TeamFlag code={td.code} size="sm" />} {t}
                              </span>
                              <span className="text-[9px] font-mono">#{td?.fifaRank}</span>
                            </div>
                          );
                        })}
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-border space-y-1">
                          {teams.map(t => {
                            const td = TEAMS[t];
                            return (
                              <div key={t} className="text-[10px] text-muted-foreground px-1">
                                <span className="font-medium text-foreground flex items-center gap-1">{td && <TeamFlag code={td.code} size="sm" />} {t}</span>
                                <span className="ml-1">· {td?.coach}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Tournament Progress */}
          <section className="px-3 mt-5">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Tournament Progress
            </h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="divide-y divide-border">
                {KNOCKOUT_ROUNDS.map(round => (
                  <div key={round.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{round.emoji}</span>
                      <div>
                        <span className="text-sm font-medium text-foreground">{round.name}</span>
                        <p className="text-[10px] text-muted-foreground">{round.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPremium ? (
                        <span className="text-[10px] text-muted-foreground">Coming soon</span>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Locked</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-muted/30 border-t border-border">
                <p className="text-[11px] text-muted-foreground text-center">
                  {isPremium ? "Full bracket & predictions available when knockout stage begins" : "Follow the full tournament in the app"}
                </p>
              </div>
            </Card>
          </section>

          {/* Featured Match */}
          <section className="px-3 mt-5">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" /> Featured Match
            </h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1 text-center">{FEATURED_MATCH.league}</div>
                <div className="text-[10px] text-muted-foreground mb-2 text-center flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" /> {FEATURED_MATCH.venue}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 text-center">
                    <div className="mb-1">{TEAMS[FEATURED_MATCH.homeTeam] && <TeamFlag code={TEAMS[FEATURED_MATCH.homeTeam].code} size="lg" />}</div>
                    <p className="text-sm font-bold text-foreground">{FEATURED_MATCH.homeTeam}</p>
                    <p className="text-[10px] text-muted-foreground">#{TEAMS[FEATURED_MATCH.homeTeam]?.fifaRank}</p>
                  </div>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-xs text-muted-foreground">{FEATURED_MATCH.date}</span>
                    <span className="text-lg font-bold text-primary">{FEATURED_MATCH.time}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mb-1">{TEAMS[FEATURED_MATCH.awayTeam] && <TeamFlag code={TEAMS[FEATURED_MATCH.awayTeam].code} size="lg" />}</div>
                    <p className="text-sm font-bold text-foreground">{FEATURED_MATCH.awayTeam}</p>
                    <p className="text-[10px] text-muted-foreground">#{TEAMS[FEATURED_MATCH.awayTeam]?.fifaRank}</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Badge className="bg-destructive/20 text-destructive text-[10px] border-destructive/30">🔥 AI Prediction</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mb-2">AI sees this before kickoff</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div><span className="text-lg font-bold text-emerald-400">{appCanSeeBasic ? `${AI_PREDICTIONS[0]?.homeWin || 45}%` : <Lock className="h-4 w-4 inline text-muted-foreground" />}</span><p className="text-[10px] font-semibold text-foreground">Home</p></div>
                    <div><span className="text-lg font-bold text-amber-400">{appCanSeeBasic ? `${AI_PREDICTIONS[0]?.draw || 25}%` : <Lock className="h-4 w-4 inline text-muted-foreground" />}</span><p className="text-[10px] font-semibold text-foreground">Draw</p></div>
                    <div><span className="text-lg font-bold text-sky-400">{appCanSeeBasic ? `${AI_PREDICTIONS[0]?.awayWin || 30}%` : <Lock className="h-4 w-4 inline text-muted-foreground" />}</span><p className="text-[10px] font-semibold text-foreground">Away</p></div>
                  </div>
                </div>
                {/* App: Free user watch ad CTA */}
                {isApp && !appCanSeeBasic && (
                  <Button onClick={handleWatchAd} disabled={adLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs mt-2">
                    <Play className="h-3.5 w-3.5 mr-1.5" /> {adLoading ? "Loading Ad…" : "Watch Ad to Unlock Predictions"}
                  </Button>
                )}
                {/* Web: Free user lock overlay */}
                {!isApp && !isPro && <AppLockOverlay message="Full match details available in app" buttonText="Open App & Unlock" compact />}
                {appCanSeeBasic && !isPremium && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Smartphone className="h-3 w-3" /> Better live experience in app
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Tier-aware CTA */}
          <section className="px-3 mt-6 mb-4">
            {!isPro ? (
              /* FREE user — Pro upsell */
              <Card className="bg-card border-border overflow-hidden border-t-2 border-t-amber-500">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <Brain className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Unlock AI Predictions</h3>
                      <p className="text-[10px] text-muted-foreground">Get Pro for World Cup insights</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[
                      "AI match predictions with win probabilities",
                      "1 free AI pick daily on web",
                      "Live match schedule access",
                      "Priority access during World Cup",
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-foreground/80">
                        <span className="text-amber-500">✓</span> {f}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => navigate("/get-premium")} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> Get Pro — €3.99/mo
                    </Button>
                    <Button variant="outline" onClick={openPlayStore} className="flex-1 text-xs border-border">
                      <Smartphone className="h-3.5 w-3.5 mr-1.5" /> More options in App
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    📱 Watch ads to unlock predictions for free — only in the app
                  </p>
                </div>
              </Card>
            ) : !isPremium ? (
              /* PRO user — app promo + Premium upsell */
              <Card className="bg-card border-border overflow-hidden">
                <div className="p-5 text-center">
                  <Trophy className="h-7 w-7 text-amber-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-foreground mb-1">Get the Full World Cup Experience</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Upgrade to <span className="text-fuchsia-400 font-semibold">Premium</span> for advanced AI, all picks unlocked & priority access
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => navigate("/get-premium")} size="sm" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Premium
                    </Button>
                    <Button variant="outline" size="sm" onClick={openPlayStore} className="text-xs border-border">
                      <Smartphone className="h-3.5 w-3.5 mr-1.5" /> Better experience in App
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              /* PREMIUM user — subtle app promo */
              <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                <span>ProPredict app offers the best World Cup experience with live tracking</span>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ==================== AI PREDICTIONS ==================== */}
        <TabsContent value="predictions" className="mt-0 px-3">
          <div className="mt-4 space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary" /> AI Match Predictions
            </h2>
            <p className="text-[10px] text-muted-foreground mb-2">Matchday 1 · Group Stage</p>

            {/* App: Free user — Watch Ad CTA at top */}
            {isApp && !appCanSeeBasic && (
              <Card className="bg-amber-500/10 border-amber-500/30 p-3 mb-3">
                <div className="text-center">
                  <Lock className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground mb-1">Predictions Locked</p>
                  <p className="text-[10px] text-muted-foreground mb-2">Watch a short ad to unlock all predictions for today</p>
                  <Button onClick={handleWatchAd} disabled={adLoading} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs w-full">
                    <Play className="h-3.5 w-3.5 mr-1.5" /> {adLoading ? "Loading Ad…" : "Watch Ad to Unlock All"}
                  </Button>
                </div>
              </Card>
            )}

            {AI_PREDICTIONS.map((pred, i) => {
              // APP: free+ad or pro sees basic; web: existing rules
              const showBasic = isApp ? appCanSeeBasic : (isPremium || (isPro && i === 0));
              return (
                <Card key={i} className="bg-card border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {TEAMS[pred.home] && <TeamFlag code={TEAMS[pred.home].code} size="sm" />} {pred.home} vs {TEAMS[pred.away] && <TeamFlag code={TEAMS[pred.away].code} size="sm" />} {pred.away}
                    </span>
                    {showBasic ? (
                      appCanSeeAdvanced ? (
                        <Badge variant="outline" className="text-[9px] flex items-center gap-0.5 border-emerald-500/50 text-emerald-400">
                          {pred.confidence}% conf
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Basic</Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-[9px] flex items-center gap-0.5"><Lock className="h-3 w-3" /> Locked</Badge>
                    )}
                  </div>

                  {/* === BASIC: Win probability === */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-muted/30 rounded p-1.5">
                      {showBasic ? <p className="text-sm font-bold text-emerald-400">{pred.homeWin}%</p> : <Lock className="h-4 w-4 text-muted-foreground/50 mx-auto" />}
                      <p className="text-[9px] font-semibold text-foreground">Home</p>
                    </div>
                    <div className="bg-muted/30 rounded p-1.5">
                      {showBasic ? <p className="text-sm font-bold text-amber-400">{pred.draw}%</p> : <Lock className="h-4 w-4 text-muted-foreground/50 mx-auto" />}
                      <p className="text-[9px] font-semibold text-foreground">Draw</p>
                    </div>
                    <div className="bg-muted/30 rounded p-1.5">
                      {showBasic ? <p className="text-sm font-bold text-sky-400">{pred.awayWin}%</p> : <Lock className="h-4 w-4 text-muted-foreground/50 mx-auto" />}
                      <p className="text-[9px] font-semibold text-foreground">Away</p>
                    </div>
                  </div>

                  {/* === BASIC: Over/Under + BTTS (visible for pro/ad-unlocked) === */}
                  {showBasic && (
                    <div className="grid grid-cols-2 gap-2 text-center mb-2">
                      <div className="bg-muted/20 rounded p-1.5">
                        <p className="text-xs font-bold text-foreground">{pred.homeWin > 40 ? "Over" : "Under"} 2.5</p>
                        <p className="text-[9px] text-muted-foreground">Goals</p>
                      </div>
                      <div className="bg-muted/20 rounded p-1.5">
                        <p className="text-xs font-bold text-foreground">{pred.draw > 25 ? "Yes" : "No"}</p>
                        <p className="text-[9px] text-muted-foreground">BTTS</p>
                      </div>
                    </div>
                  )}

                  {/* === ADVANCED: Premium section (blurred for non-premium) === */}
                  {showBasic && (
                    <div className="relative mt-1">
                      <div className={`rounded-lg border p-3 space-y-2 ${appCanSeeAdvanced ? "border-primary/20 bg-primary/5" : "border-border/30 bg-muted/10 blur-[3px] select-none pointer-events-none"}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">Advanced AI Analysis</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Predicted Score</span>
                            <p className="font-bold text-foreground">{pred.homeWin > pred.awayWin ? "2-1" : pred.awayWin > pred.homeWin ? "0-1" : "1-1"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence</span>
                            <p className="font-bold text-foreground">{pred.confidence}%</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">AI Insight:</span> Based on FIFA rankings, recent form, and historical data, {pred.homeWin > pred.awayWin ? pred.home : pred.away} has the edge in this matchup.
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">Key Factors:</span> Home advantage, squad depth, tactical approach
                        </div>
                      </div>
                      {/* Lock overlay for non-premium */}
                      {!appCanSeeAdvanced && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 rounded-lg">
                          <Lock className="h-5 w-5 text-fuchsia-400 mb-1" />
                          <p className="text-[11px] font-semibold text-foreground">Unlock Advanced AI Analysis</p>
                          <p className="text-[9px] text-muted-foreground mb-2">Predicted score, insights & key factors</p>
                          <Button size="sm" onClick={() => navigate("/get-premium")} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-[10px] h-7 px-3">
                            <Zap className="h-3 w-3 mr-1" /> Get Premium
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Web: Free user lock */}
                  {!isApp && !showBasic && <AppLockOverlay message="Full AI analysis available in app" buttonText="Open App to Unlock" compact />}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ==================== MATCHES ==================== */}
        <TabsContent value="matches" className="mt-0 px-3">
          <div className="mt-4">
          {/* App: matches tab is free for all users; Web: existing lock rules */}
          {!isApp && !isPro ? (
            <AppLockOverlay message="Live match tracking available in app only" buttonText="Open App to Unlock" />
          ) : null}

          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Match Schedule
          </h2>
            <div className="flex gap-2 mb-3">
              {([
                { key: "md1", label: "Matchday 1" },
                { key: "md2", label: "Matchday 2" },
                { key: "md3", label: "Matchday 3" },
              ] as const).map(f => (
                <Button key={f.key} size="sm" variant={matchesFilter === f.key ? "default" : "outline"}
                  className="text-[11px] h-7 px-3" onClick={() => setMatchesFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {(matchesByDay[matchesFilter] || []).length > 0 ? (
                matchesByDay[matchesFilter].map((m, i) => (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[9px]">Group {m.group}</Badge>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {m.city}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {TEAMS[m.home] && <TeamFlag code={TEAMS[m.home].code} size="sm" />}
                          <span className="text-xs font-semibold text-foreground">{m.home}</span>
                          <span className="text-[9px] text-muted-foreground">#{TEAMS[m.home]?.fifaRank}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {TEAMS[m.away] && <TeamFlag code={TEAMS[m.away].code} size="sm" />}
                          <span className="text-xs font-semibold text-foreground">{m.away}</span>
                          <span className="text-[9px] text-muted-foreground">#{TEAMS[m.away]?.fifaRank}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">{m.date}</p>
                        <p className="text-sm font-bold text-primary">{m.time}</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Schedule will be available soon</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== STANDINGS ==================== */}
        <TabsContent value="standings" className="mt-0 px-3">
          <div className="mt-4 space-y-3">
            {/* App: Free users — locked; Pro/Premium — unlocked */}
            {isApp && !isPro && (
              <Card className="bg-card border-border p-5 text-center">
                <Lock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">Standings Locked</p>
                <p className="text-[10px] text-muted-foreground mb-3">Upgrade to Pro or Premium to unlock World Cup standings</p>
                <Button onClick={() => navigate("/get-premium")} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Pro / Premium
                </Button>
              </Card>
            )}
            {/* Web: Free users — locked */}
            {!isApp && !isPro && (
              <Card className="bg-card border-border p-5 text-center">
                <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">Standings Locked</p>
                <p className="text-[10px] text-muted-foreground mb-3">Team stats & details available in app</p>
                <AppLockOverlay message="Team stats & details available in app" compact />
              </Card>
            )}
            {/* Pro/Premium — show standings */}
            {(isApp ? isPro : isPro) && (
              <>
                {liveStandings?.hasData && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] mb-2">
                    ✅ Live data from API-Football
                  </Badge>
                )}
                {Object.entries(GROUPS).map(([group, teams]) => {
                  const liveGroup = liveStandings?.standings?.[group];
                  return (
                    <Card key={group} className="bg-card border-border overflow-hidden">
                      <div className="px-3 py-2 bg-muted/30 border-b border-border">
                        <span className="text-xs font-bold text-primary">Group {group}</span>
                      </div>
                      <div className="p-2">
                        <div className="grid grid-cols-8 text-[9px] text-muted-foreground font-medium mb-1 px-1">
                          <span className="col-span-4">Team</span>
                          <span className="text-center">P</span>
                          <span className="text-center">W</span>
                          <span className="text-center">GD</span>
                          <span className="text-center">Pts</span>
                        </div>
                        {teams.map((t, idx) => {
                          const td = TEAMS[t];
                          const live = liveGroup?.find(lt => 
                            lt.team.toLowerCase().includes(t.toLowerCase()) || 
                            t.toLowerCase().includes(lt.team.toLowerCase())
                          );
                          const played = live?.played ?? 0;
                          const win = live?.win ?? 0;
                          const gd = live?.goalsDiff ?? 0;
                          const pts = live?.points ?? 0;
                          return (
                            <div key={t}
                              className={`grid grid-cols-8 text-[11px] px-1 py-1.5 rounded cursor-pointer hover:bg-muted/30 ${
                                idx < 2 ? "text-emerald-400" : idx === 3 ? "text-destructive" : "text-foreground"
                              }`}
                              onClick={isPro ? () => setSelectedTeam(t) : undefined}
                            >
                              <span className="col-span-4 truncate font-medium flex items-center gap-1">
                                {td && <TeamFlag code={td.code} size="sm" />} {t}
                              </span>
                              <span className="text-center">{played}</span>
                              <span className="text-center">{win}</span>
                              <span className="text-center">{gd}</span>
                              <span className="text-center font-bold">{pts}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </TabsContent>

        {/* ==================== TEAMS ==================== */}
        <TabsContent value="teams" className="mt-0 px-3">
          <div className="mt-4">
            {/* App: Free users — locked */}
            {isApp && !isPro && (
              <Card className="bg-card border-border p-5 text-center">
                <Lock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">Teams Locked</p>
                <p className="text-[10px] text-muted-foreground mb-3">Upgrade to Pro or Premium to unlock full team data</p>
                <Button onClick={() => navigate("/get-premium")} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Pro / Premium
                </Button>
              </Card>
            )}
            {/* Web: Free users — locked */}
            {!isApp && !isPro && (
              <Card className="bg-card border-border p-5 text-center">
                <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">Teams Locked</p>
                <AppLockOverlay message="Full team data available in app" compact />
              </Card>
            )}
            {/* Pro/Premium — show teams */}
            {isPro && (
              <>
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={teamsSearch}
                  onChange={e => setTeamsSearch(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:border-primary/50"
                />
                <div className="space-y-1.5">
                  {filteredTeams.map(({ team, group }) => {
                    const td = TEAMS[team];
                    return (
                      <Card key={team} className="bg-card border-border p-3 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => setSelectedTeam(team)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {td && <TeamFlag code={td.code} size="md" />}
                            <div>
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                {team}
                                {td?.debut && <Badge className="bg-yellow-500/20 text-yellow-400 text-[8px] px-1 py-0 border-yellow-500/30">DEBUT</Badge>}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Group {group} · #{td?.fifaRank}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
