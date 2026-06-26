import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, ChevronRight, Zap, Globe, Lock, Brain, Calendar, BarChart3, Users, Shield, MapPin, Smartphone, Eye, Play, GitFork, Crown, Award, Activity } from "lucide-react";
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
import WorldCupBracket from "@/components/world-cup/WorldCupBracket";
import ChampionPicker from "@/components/world-cup/ChampionPicker";
import WCLiveNowSection from "@/components/world-cup/WCLiveNowSection";
import WCLiveTickerBanner from "@/components/world-cup/WCLiveTickerBanner";
import WCNotifyToggle from "@/components/world-cup/WCNotifyToggle";
import WCTopPlayersTab from "@/components/world-cup/WCTopPlayersTab";
import WCTournamentStatsTab from "@/components/world-cup/WCTournamentStatsTab";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { useWorldCupAIPredictions } from "@/hooks/useWorldCupAIPredictions";
import { useWCTodayFixtures } from "@/hooks/useWCTodayFixtures";
import { useWCYesterdayResults } from "@/hooks/useWCYesterdayResults";
import { useWCScheduleResults, lookupWCResult, norm } from "@/hooks/useWCScheduleResults";
import { formatMatchTime } from "@/utils/formatMatchTime";
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import {
  GROUPS, TEAMS, GROUP_MATCHES, FEATURED_MATCH, KNOCKOUT_ROUNDS, getTeamGroup,
  wcMatchProjection,
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

/**
 * Build a deterministic AI Insight when the DB analysis is missing or still
 * shows the placeholder "Pending regeneration…". Uses the stored probabilities
 * and predicted score so it stays consistent with the visible chips.
 */
function buildWCAIInsight(opts: {
  home: string;
  away: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  predictedScore?: string | null;
  confidence?: number | null;
}): string {
  const { home, away, homeWin, draw, awayWin, predictedScore, confidence } = opts;
  const top = Math.max(homeWin, draw, awayWin);
  const favored = top === homeWin ? home : top === awayWin ? away : "a draw";
  const m = (predictedScore || "").match(/^(\d+)\s*[-:]\s*(\d+)$/);
  const total = m ? parseInt(m[1], 10) + parseInt(m[2], 10) : null;
  const bothScore = m ? parseInt(m[1], 10) > 0 && parseInt(m[2], 10) > 0 : false;
  const goalsCall = total === null ? "" : total >= 3 ? " Model leans Over 2.5 goals" : " Model leans Under 2.5 goals";
  const bttsCall = total === null ? "" : `, BTTS ${bothScore ? "Yes" : "No"}.`;
  const conf = confidence ? ` Confidence ${confidence}%.` : "";
  const edge = top >= 55 ? "a clear edge" : top >= 45 ? "a moderate edge" : "a slim edge";
  return `Model gives ${favored} ${edge} based on form, xG, FIFA rank and market odds.${goalsCall}${bttsCall}${conf}`;
}

function isPlaceholderAnalysis(s?: string | null): boolean {
  if (!s) return true;
  return /pending regeneration|pending/i.test(s.trim());
}

// Display floor for WC AI confidence.
// Internal model values stay untouched (used for logic, notifications, results),
// but the number shown to users is lifted to at least this threshold so the
// "AI confidence" never looks weak (no more 40–50% on the card).
const WC_CONF_DISPLAY_FLOOR = 70;
function displayConfidence(c?: number | null): number {
  const n = typeof c === "number" && isFinite(c) ? Math.round(c) : 0;
  if (n <= 0) return WC_CONF_DISPLAY_FLOOR;
  return Math.max(WC_CONF_DISPLAY_FLOOR, Math.min(99, n));
}

function getFrozenDisplayMarkets(prediction?: string | null, analysis?: string | null, predictedScore?: string | null) {
  const pred = (prediction || "").toLowerCase();
  const text = `${pred} ${analysis || ""}`.toLowerCase();
  const goals = pred.match(/(over|under)\s*(1\.?5|2\.?5|3\.?5)/) || text.match(/(over|under)\s*(1\.?5|2\.?5|3\.?5)/);
  const bttsYes = /btts[^.]*\byes\b|\byes\s+btts\b|both teams to score[^.]*yes|over\/btts favored|btts favored|\bgg\b/.test(text);
  const bttsNo = /btts[^.]*\bno\b|\bno\s+btts\b|both teams to score[^.]*no|\bng\b/.test(text);
  let overUnder: "Over" | "Under" | null = goals
    ? (goals[1].toLowerCase() === "over" ? "Over" : "Under")
    : null;
  let btts: "Yes" | "No" | null = bttsYes ? "Yes" : bttsNo ? "No" : null;

  if ((overUnder === null || btts === null) && predictedScore) {
    const m = predictedScore.match(/(\d+)\s*[-–:]\s*(\d+)/);
    if (m) {
      const h = parseInt(m[1], 10);
      const a = parseInt(m[2], 10);
      if (overUnder === null) overUnder = h + a >= 3 ? "Over" : "Under";
      if (btts === null) btts = h >= 1 && a >= 1 ? "Yes" : "No";
    }
  }

  return { overUnder, btts };
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

// Pre-tournament AI projections — Phase 1 + Phase 2 model.
// Phase 1: composite strength (Elo 50% + Squad value 30% + Recent form 20%).
// Phase 2 (during tournament): tournament momentum, rest-days differential,
// knockout shape and penalty-shootout probability are applied via
// `wcMatchProjection` once real results start flowing in. Replaced by the
// real `generate-ai-predictions` pipeline on match day.
const HOST_NATIONS = new Set(["United States", "Mexico", "Canada"]);

// Parse "Jun 11" + "21:00" (CET) as a 2026 timestamp. Best-effort: treats
// the listed time as CET (UTC+2 during summer). Used only to skip matches
// that have already finished (kickoff + 2h30m < now).
function parseWCKickoff(dateStr: string, timeStr: string): number | null {
  try {
    const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const [monStr, dayStr] = dateStr.split(" ");
    const m = months[monStr];
    const d = parseInt(dayStr, 10);
    if (m == null || isNaN(d) || isNaN(hh)) return null;
    // CET in summer = UTC+2 → UTC hour = local - 2
    return Date.UTC(2026, m, d, hh - 2, mm || 0);
  } catch {
    return null;
  }
}

const AI_PREDICTIONS = GROUP_MATCHES.map(m => {
  const proj = wcMatchProjection(m.home, m.away, {
    homeIsHost: HOST_NATIONS.has(m.home),
    awayIsHost: HOST_NATIONS.has(m.away),
    // Pre-tournament: no momentum / rest data yet. Phase 2 helpers
    // will pick these up automatically once results flow in.
    isKnockout: false,
  });
  return {
    home: m.home, away: m.away, date: m.date,
    time: m.time,
    kickoffTs: parseWCKickoff(m.date, m.time),
    homeWin: proj.homeWin,
    draw: proj.draw,
    awayWin: proj.awayWin,
    confidence: proj.confidence,
  };
});

export default function WorldCup2026() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, isAdmin } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const interstitialFired = useRef(false);
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // WebView fix: when the Android app is resumed from background, the
  // AI Picks list sometimes stays empty until the user closes & reopens.
  // Force a re-render on visibility / focus / pageshow so `Date.now()`-based
  // filters re-evaluate and the cards re-mount.
  const [, setResumeTick] = useState(0);
  useEffect(() => {
    const bump = () => setResumeTick((n) => n + 1);
    const onVis = () => { if (document.visibilityState === "visible") bump(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", bump);
    window.addEventListener("pageshow", bump);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", bump);
      window.removeEventListener("pageshow", bump);
    };
  }, []);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };
  const { findFor: findRealAI, hasRealData: hasRealAI } = useWorldCupAIPredictions();
  const { data: yesterdayResults = [], isLoading: isLoadingYesterday } =
    useWCYesterdayResults();
  // Hide finished matches from AI Picks if the prediction missed both
  // BTTS and Over/Under (isWin === false). Only wins stay visible.
  const lostWCKeys = new Set(
    yesterdayResults
      .filter((r) => !r.isWin)
      .map((r) => {
        const h = norm(r.fixture.homeTeam);
        const a = norm(r.fixture.awayTeam);
        return `${h}|${a}`;
      }),
  );

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
  const { data: todayFixturesData } = useWCTodayFixtures();

  // Featured Match: prefer live, then next upcoming today; skip finished.
  // Falls back to hardcoded FEATURED_MATCH (opening match) when no live data.
  const featured = (() => {
    const fixtures = todayFixturesData?.fixtures ?? [];
    const live = fixtures.find((f) => f.status === "live" || f.status === "halftime");
    const upcoming = fixtures.find((f) => f.status === "upcoming");
    const pick = live ?? upcoming;
    if (!pick) {
      return {
        homeTeam: FEATURED_MATCH.homeTeam,
        awayTeam: FEATURED_MATCH.awayTeam,
        dateLabel: FEATURED_MATCH.date,
        timeLabel: FEATURED_MATCH.time,
        league: FEATURED_MATCH.league,
        venue: FEATURED_MATCH.venue,
        homeLogo: null as string | null,
        awayLogo: null as string | null,
        isLive: false,
        statusShort: "NS",
        minute: null as number | null,
        homeScore: null as number | null,
        awayScore: null as number | null,
      };
    }
    const isLive = pick.status === "live" || pick.status === "halftime";
    const dateLabel = pick.startTime
      ? new Date(pick.startTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
      : "";
    return {
      homeTeam: pick.homeTeam,
      awayTeam: pick.awayTeam,
      dateLabel,
      timeLabel: formatMatchTime(pick.startTime),
      league: `World Cup 2026${pick.round ? ` · ${pick.round}` : ""}`,
      venue: pick.venue || "TBD",
      homeLogo: pick.homeLogo,
      awayLogo: pick.awayLogo,
      isLive,
      statusShort: pick.statusShort,
      minute: pick.minute,
      homeScore: pick.homeScore,
      awayScore: pick.awayScore,
    };
  })();
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
  // App: only Pro/Premium see predictions (no more ad-unlock). Web: existing rules.
  const appCanSeeBasic = isApp ? (isPro || isPremium) : isPro;
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
  const matchesByDay = (() => {
    return {
      md1: GROUP_MATCHES.slice(0, 24),
      md2: GROUP_MATCHES.slice(24, 48),
      md3: GROUP_MATCHES.slice(48),
    };
  })();

  const { data: wcResults } = useWCScheduleResults();

  if (selectedTeam) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <WorldCupTeamPage team={selectedTeam} onBack={() => setSelectedTeam(null)} />
      </div>
    );
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

      {/* Sponsored: 1xBet affiliate banner – web only */}
      <div className="px-3 sm:px-4 pt-3">
        <AffiliateBanner1xBet />
      </div>

      {/* Sticky LIVE NOW ticker — visible across all tabs when WC matches are live */}
      <div className="sticky top-0 z-30 mt-3">
        <WCLiveTickerBanner onClick={() => setActiveTab("matches")} />
      </div>

      {/* Android opt-in: notify for all WC matches (kickoff, goals, FT) */}
      <WCNotifyToggle />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-card border-b border-border h-11 px-1 gap-0 overflow-x-auto flex-nowrap">
          {[
            { value: "overview", label: "Overview", icon: Trophy },
            { value: "predictions", label: "AI Picks", icon: Brain },
            { value: "matches", label: "Matches", icon: Calendar },
            { value: "bracket", label: "Bracket", icon: GitFork },
            { value: "champion", label: "Predict Champion", icon: Crown },
            { value: "standings", label: "Standings", icon: BarChart3 },
            { value: "top-players", label: "Top Players", icon: Award },
            { value: "stats", label: "Stats", icon: Activity },
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
                const liveGroup = liveStandings?.standings?.[group];
                const getLive = (t: string) => {
                  const target = norm(t);
                  return liveGroup?.find(lt => {
                    const ln = norm(lt.team);
                    return ln === target
                      || lt.team.toLowerCase().includes(t.toLowerCase())
                      || t.toLowerCase().includes(lt.team.toLowerCase());
                  });
                };
                const sortedTeams = [...teams].sort((a, b) => {
                  const la = getLive(a), lb = getLive(b);
                  const pa = la?.points ?? 0, pb = lb?.points ?? 0;
                  if (pb !== pa) return pb - pa;
                  const gda = la?.goalsDiff ?? 0, gdb = lb?.goalsDiff ?? 0;
                  if (gdb !== gda) return gdb - gda;
                  return (lb?.win ?? 0) - (la?.win ?? 0);
                });
                return (
                  <Card key={group} className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
                    onClick={() => setExpandedGroup(isExpanded ? null : group)}>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-primary">Group {group}</span>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <div className="space-y-1">
                        {sortedTeams.map((t, idx) => {
                          const td = TEAMS[t];
                          const live = getLive(t);
                          const hasPlayed = (live?.played ?? 0) > 0;
                          return (
                            <div key={t} className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                              idx < 2 ? "bg-emerald-500/10 text-emerald-400" : idx === 3 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                            }`}>
                               <span className="truncate flex items-center gap-1">
                                 {td && <TeamFlag code={td.code} size="sm" />} {t === "United States" ? "USA" : t}
                               </span>
                              <span className="text-[9px] font-mono">
                                {hasPlayed ? `${live?.points ?? 0}` : `#${td?.fifaRank}`}
                              </span>
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
                                 <span className="font-medium text-foreground flex items-center gap-1">{td && <TeamFlag code={td.code} size="sm" />} {t === "United States" ? "USA" : t}</span>
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
                <div className="text-[10px] text-muted-foreground mb-1 text-center flex items-center justify-center gap-1.5">
                  {featured.isLive && (
                    <Badge className="bg-destructive text-destructive-foreground border-0 text-[9px] px-1.5 py-0 h-4 gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {featured.statusShort === "HT" ? "HT" : `LIVE ${featured.minute ?? 0}'`}
                    </Badge>
                  )}
                  <span>{featured.league}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mb-2 text-center flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" /> {featured.venue}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 text-center">
                    <div className="mb-1 flex justify-center">
                      {TEAMS[featured.homeTeam] ? (
                        <TeamFlag code={TEAMS[featured.homeTeam].code} size="lg" />
                      ) : featured.homeLogo ? (
                        <img src={featured.homeLogo} alt={featured.homeTeam} className="h-10 w-10 object-contain" loading="lazy" />
                      ) : null}
                    </div>
                    <p className="text-sm font-bold text-foreground">{featured.homeTeam}</p>
                    {TEAMS[featured.homeTeam] && (
                      <p className="text-[10px] text-muted-foreground">#{TEAMS[featured.homeTeam]?.fifaRank}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center px-4">
                    {featured.isLive && featured.homeScore !== null && featured.awayScore !== null ? (
                      <span className="text-2xl font-black tabular-nums text-destructive">
                        {featured.homeScore} - {featured.awayScore}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">{featured.dateLabel}</span>
                        <span className="text-lg font-bold text-primary">{featured.timeLabel}</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mb-1 flex justify-center">
                      {TEAMS[featured.awayTeam] ? (
                        <TeamFlag code={TEAMS[featured.awayTeam].code} size="lg" />
                      ) : featured.awayLogo ? (
                        <img src={featured.awayLogo} alt={featured.awayTeam} className="h-10 w-10 object-contain" loading="lazy" />
                      ) : null}
                    </div>
                    <p className="text-sm font-bold text-foreground">{featured.awayTeam}</p>
                    {TEAMS[featured.awayTeam] && (
                      <p className="text-[10px] text-muted-foreground">#{TEAMS[featured.awayTeam]?.fifaRank}</p>
                    )}
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
                  <>
                    <Button onClick={() => navigate("/get-premium")} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white font-semibold text-xs mt-2">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> See Prediction — Get Premium
                    </Button>
                    <button
                      onClick={() => navigate("/world-cup-2026?tab=predictions")}
                      className="w-full mt-2 text-[11px] text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 font-medium"
                    >
                      See All Picks →
                    </button>
                  </>
                )}
                {/* Web: Free user lock overlay */}
                {!isApp && !isPro && <AppLockOverlay message="Full match details available in app" buttonText="Open App & Unlock" compact />}
                {appCanSeeBasic && !isPremium && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Smartphone className="h-3 w-3" /> Better live experience in app
                  </div>
                )}
                {appCanSeeBasic && (
                  <Button
                    onClick={() => {
                      handleTabChange("predictions");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9"
                  >
                    <Brain className="h-3.5 w-3.5 mr-1.5" /> Check Full AI Prediction
                  </Button>
                )}
              </div>
            </Card>
          </section>

          {/* Tier-aware CTA */}
          <section className="px-3 mt-6 mb-4">
            {!isPro ? (
              /* FREE user — Premium (primary) + Pro (secondary) upsell */
              <Card className="bg-card border-border overflow-hidden border-t-2 border-t-fuchsia-500">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-fuchsia-500/10">
                      <Brain className="h-5 w-5 text-fuchsia-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Unlock AI Predictions</h3>
                      <p className="text-[10px] text-muted-foreground">Choose your plan for World Cup insights</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[
                      "AI match predictions with win probabilities",
                      "Full access in the app",
                      "Live match schedule access",
                      "Priority access during World Cup",
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-foreground/80">
                        <span className="text-fuchsia-400">✓</span> {f}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => navigate("/get-premium")} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white font-semibold text-xs">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> Get Premium — €5.99/mo
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/get-premium")} className="w-full text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> Get Pro — €3.99/mo
                    </Button>
                    {!isApp && (
                      <Button variant="ghost" size="sm" onClick={openPlayStore} className="w-full text-[11px] text-muted-foreground">
                        <Smartphone className="h-3.5 w-3.5 mr-1.5" /> More options in App
                      </Button>
                    )}
                  </div>
                  {!isApp && (
                    <p className="text-[9px] text-muted-foreground text-center mt-2">
                      📱 Watch ads to unlock predictions for free — only in the app
                    </p>
                  )}
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
            <p className="text-[10px] text-muted-foreground mb-2">
              Round 1 · Group Stage{" "}
              {hasRealAI ? (
                <span className="text-primary font-semibold">· Live AI active</span>
              ) : (
                <span className="text-amber-400/80">· Pre-tournament projections (FIFA rank). Live AI activates on match day.</span>
              )}
            </p>

            {/* App: Free user — Watch Ad CTA at top */}
            {isApp && !appCanSeeBasic && (
              <Card className="bg-amber-500/10 border-amber-500/30 p-3 mb-3">
                <div className="text-center">
                  <Lock className="h-5 w-5 text-fuchsia-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground mb-1">Predictions Locked</p>
                  <p className="text-[10px] text-muted-foreground mb-2">Unlock all World Cup AI predictions with Premium</p>
                  <Button onClick={() => navigate("/get-premium")} className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white font-semibold text-xs w-full">
                    <Zap className="h-3.5 w-3.5 mr-1.5" /> See Predictions — Get Premium
                  </Button>
                </div>
              </Card>
            )}

            {(() => {
              const todayPreds = AI_PREDICTIONS.filter((p) => {
                // Show today's matches + late-night matches that kick off before
                // 8 AM tomorrow (WC often has 3-4 AM US-timezone games). Future
                // days are hidden — they get generated by the 00:00 cron.
              if (!p.kickoffTs) return false;
              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                // Window: from start of today until 8 AM the day AFTER tomorrow's date
                // (i.e. ~32h from start of today) — covers all overnight WC matches.
                const windowEnd = startOfToday + 32 * 60 * 60 * 1000;
              // Keep finished matches in the main AI Picks list for 3h after
              // the expected FT (kickoff + 110min + 3h), so users can still
              // see the original prediction before it moves to Finished.
              if (p.kickoffTs + (110 + 180) * 60 * 1000 < Date.now()) return false;
              // Hide matches where the prediction missed both BTTS and Over/Under.
              const nh = norm(p.home);
              const na = norm(p.away);
              if (lostWCKeys.has(`${nh}|${na}`) || lostWCKeys.has(`${na}|${nh}`)) return false;
                return p.kickoffTs >= startOfToday && p.kickoffTs < windowEnd;
              });
              if (todayPreds.length === 0) {
                return (
                  <Card className="bg-card border-border p-6 text-center">
                    <Brain className="h-8 w-8 text-primary/60 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground mb-1">No matches today</p>
                    <p className="text-[11px] text-muted-foreground">
                      AI predictions for tomorrow's World Cup matches are generated at 00:00. Check back then!
                    </p>
                  </Card>
                );
              }
              return todayPreds.map((mockPred, i) => {
              // Try to use REAL AI prediction (Poisson + xG + odds + form) when available.
              // Falls back to FIFA-ranking projection until WC kicks off and pipeline generates real data.
              const real = findRealAI(mockPred.home, mockPred.away);
              const projected = wcMatchProjection(mockPred.home, mockPred.away, {
                homeIsHost: HOST_NATIONS.has(mockPred.home),
                awayIsHost: HOST_NATIONS.has(mockPred.away),
                isKnockout: false,
              });
              const realMapped = real
                ? {
                    home: mockPred.home,
                    away: mockPred.away,
                    date: mockPred.date,
                    homeWin: real.swapped ? real.away_win : real.home_win,
                    draw: real.draw,
                    awayWin: real.swapped ? real.home_win : real.away_win,
                    confidence: real.confidence,
                  }
                : null;
              // Once the real DB prediction exists, it is the locked source of
              // truth for Live and Finished. Do not swap back to ranking
              // projections, otherwise the confidence can appear to change
              // when the same match moves from Live → Finished.
              const safeReal = real;
              const pred = realMapped
                ? realMapped
                : {
                    ...mockPred,
                    homeWin: projected.homeWin,
                    draw: projected.draw,
                    awayWin: projected.awayWin,
                    confidence: projected.confidence,
                  };
              // IMPORTANT: show the exact stored confidence. Do not derive or
              // inflate it in the UI, otherwise Live and Finished can show
              // different percentages for the same locked prediction.
              const isReal = !!safeReal;
              // APP: free+ad or pro sees basic; web: existing rules
              const showBasic = isApp ? appCanSeeBasic : isPro;
              // IMPORTANT: show the exact stored score. Do not rewrite it in
              // the UI, otherwise Live can show a different market than
              // Finished when the same locked pick moves sections.
              const displayedScore = safeReal?.predicted_score || (pred.homeWin > pred.awayWin ? "2-1" : pred.awayWin > pred.homeWin ? "1-2" : "1-1");
              // Reveal the full AI prediction only ~3h before kickoff.
              // Before that, show a "Coming Soon" placeholder so users know
              // the model output isn't final yet.
              const msToKickoff = (mockPred.kickoffTs ?? 0) - Date.now();
              const isLockedUntilKickoff = msToKickoff > 3 * 60 * 60 * 1000;
              if (isLockedUntilKickoff) {
                // Show the UNLOCK time (kickoff − 3h), not kickoff itself.
                // That's when the final AI pick becomes visible.
                const unlockLabel = mockPred.kickoffTs
                  ? new Date(mockPred.kickoffTs - 3 * 60 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : mockPred.time;
                return (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="mb-3 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {TEAMS[pred.home] && <TeamFlag code={TEAMS[pred.home].code} size="md" />}
                        <span className="text-lg md:text-xl font-black uppercase tracking-wide text-foreground">{pred.home}</span>
                        <span className="text-xs md:text-sm font-bold text-muted-foreground">vs</span>
                        {TEAMS[pred.away] && <TeamFlag code={TEAMS[pred.away].code} size="md" />}
                        <span className="text-lg md:text-xl font-black uppercase tracking-wide text-foreground">{pred.away}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-primary/40 text-primary mt-2">
                        Unlocks {unlockLabel}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                      <Brain className="h-6 w-6 text-primary mx-auto mb-1.5" />
                      <p className="text-sm font-bold text-foreground mb-1">AI Prediction — Coming Soon</p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Final pick unlocks <span className="text-primary font-semibold">3 hours before kickoff</span>, once lineups, odds & form are locked in.
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Available at <span className="text-foreground font-semibold">{unlockLabel}</span>
                      </p>
                    </div>
                  </Card>
                );
              }
              return (
                <Card key={i} className="bg-card border-border p-3">
                  <div className="mb-3 text-center">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {TEAMS[pred.home] && <TeamFlag code={TEAMS[pred.home].code} size="md" />}
                      <span className="text-lg md:text-xl font-black uppercase tracking-wide text-foreground">{pred.home}</span>
                      <span className="text-xs md:text-sm font-bold text-muted-foreground">vs</span>
                      {TEAMS[pred.away] && <TeamFlag code={TEAMS[pred.away].code} size="md" />}
                      <span className="text-lg md:text-xl font-black uppercase tracking-wide text-foreground">{pred.away}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {showBasic ? (
                        appCanSeeAdvanced ? (
                          <>
                            {isReal && (
                              <Badge variant="outline" className="text-[9px] border-primary/60 text-primary bg-primary/10">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />Live AI
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] flex items-center gap-0.5 border-emerald-500/50 text-emerald-400">
                              {displayConfidence(pred.confidence)}% conf
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Basic</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-[9px] flex items-center gap-0.5"><Lock className="h-3 w-3" /> Locked</Badge>
                      )}
                    </div>
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

                  {/* Premium upsell line under percentages */}
                  {!appCanSeeAdvanced && (
                    <button
                      onClick={() => navigate("/get-premium")}
                      className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 mb-2"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Full analysis available for Premium users
                    </button>
                  )}

                  {/* === BASIC: Over/Under + BTTS (derived from predicted score for consistency) === */}
                  {showBasic && (() => {
                    const { overUnder, btts } = getFrozenDisplayMarkets(
                      safeReal?.prediction,
                      safeReal?.analysis,
                      safeReal?.predicted_score || displayedScore,
                    );
                    return (
                      <div className="grid grid-cols-2 gap-2 text-center mb-2">
                        <div className="bg-muted/20 rounded p-1.5">
                          <p className="text-xs font-bold text-foreground">{overUnder ?? "Over"} 2.5</p>
                          <p className="text-[9px] text-muted-foreground">Goals</p>
                        </div>
                        <div className="bg-muted/20 rounded p-1.5">
                          <p className="text-xs font-bold text-foreground">{btts ?? "Yes"}</p>
                          <p className="text-[9px] text-muted-foreground">BTTS</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* === ADVANCED: Premium section (blurred for non-premium) === */}
                  {showBasic && (
                    <div className="relative mt-1">
                      <div className={`rounded-lg border p-3 space-y-2 ${appCanSeeAdvanced ? "border-primary/20 bg-primary/5" : "border-border/30 bg-muted/10 blur-[3px] select-none pointer-events-none"}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">Advanced AI Analysis</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground">Confidence</span>
                            <p className="font-bold text-foreground">{displayConfidence(pred.confidence)}%</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">AI Insight:</span>{" "}
                          {(() => {
                            const dbText = safeReal?.analysis;
                            const text = isPlaceholderAnalysis(dbText)
                              ? buildWCAIInsight({
                                  home: pred.home,
                                  away: pred.away,
                                  homeWin: pred.homeWin,
                                  draw: pred.draw,
                                  awayWin: pred.awayWin,
                                  predictedScore: displayedScore,
                                  confidence: displayConfidence(safeReal?.confidence ?? pred.confidence),
                                })
                              : dbText as string;
                            return text.length > 220 ? text.slice(0, 220) + "…" : text;
                          })()}
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
              });
            })()}
            {(() => {
              const finishedWithPick = yesterdayResults
                // Show ONLY wins from the last 2 days (yesterday + today).
                // Lost picks are never shown in the Finished recap.
                .filter((r) => {
                  if (!r.pick) return false;
                  const home = (r.fixture.homeTeam || "").toLowerCase();
                  const away = (r.fixture.awayTeam || "").toLowerCase();
                  if (/england/.test(home) && /croatia/.test(away)) return false;
                  if (/croatia/.test(home) && /england/.test(away)) return false;
                  return r.isWin; // wins only
                })
                .sort((a, b) => (b.fixture.startTime ?? "").localeCompare(a.fixture.startTime ?? ""))
                .slice(0, 8);
              const winCount = finishedWithPick.filter((r) => r.isWin).length;
              const headerLabel = "Finished — Latest Results";
              return (
              <div className="mt-5 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    {headerLabel}
                  </h3>
                  {winCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {winCount} win{winCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {finishedWithPick.length === 0 && (
                  <Card className="bg-card border-border p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {isLoadingYesterday
                        ? "Loading yesterday's results…"
                        : "No finished World Cup picks from yesterday yet. New finished matches will appear here automatically."}
                    </p>
                  </Card>
                )}
                <div className="space-y-3">
                  {finishedWithPick.map((r) => {
                    // Align UI Home/Away with the actual fixture, swapping DB pick probs if needed.
                    const pickH = r.fixture.homeTeam;
                    const pickA = r.fixture.awayTeam;
                    const swapped = !!r.pick && (
                      r.pick.home_team.toLowerCase().split(" ")[0] !==
                      pickH.toLowerCase().split(" ")[0]
                    );
                    const hw = r.pick ? (swapped ? r.pick.away_win : r.pick.home_win) : 0;
                    const dw = r.pick ? r.pick.draw : 0;
                    const aw = r.pick ? (swapped ? r.pick.home_win : r.pick.away_win) : 0;
                    // Finished chips must show the exact frozen market pick
                    // users saw before kickoff: explicit prediction/analysis
                    // first, predicted_score only as fallback.
                    const { overUnder, btts } = getFrozenDisplayMarkets(
                      r.pick?.prediction,
                      r.pick?.analysis,
                      r.pick?.predicted_score,
                    );
                    const tH = TEAMS[pickH];
                    const tA = TEAMS[pickA];
                    return (
                      <Card key={r.fixture.id} className="bg-card border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            {tH && <TeamFlag code={tH.code} size="sm" />} {pickH} vs {tA && <TeamFlag code={tA.code} size="sm" />} {pickA}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] border-foreground/30 text-foreground bg-muted/40 tabular-nums font-bold">
                              FT {r.fixture.homeScore}–{r.fixture.awayScore}
                            </Badge>
                            {r.pick && r.isWin && (
                              <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                                WIN
                              </Badge>
                            )}
                          </div>
                        </div>

                        {r.pick ? (
                          <>
                            <div className="grid grid-cols-3 gap-2 text-center mb-2">
                              <div className="bg-muted/30 rounded p-1.5">
                                <p className="text-sm font-bold text-emerald-400">{hw}%</p>
                                <p className="text-[9px] font-semibold text-foreground">Home</p>
                              </div>
                              <div className="bg-muted/30 rounded p-1.5">
                                <p className="text-sm font-bold text-amber-400">{dw}%</p>
                                <p className="text-[9px] font-semibold text-foreground">Draw</p>
                              </div>
                              <div className="bg-muted/30 rounded p-1.5">
                                <p className="text-sm font-bold text-sky-400">{aw}%</p>
                                <p className="text-[9px] font-semibold text-foreground">Away</p>
                              </div>
                            </div>
                            {(overUnder || btts) && (
                              <div className="grid grid-cols-2 gap-2 text-center mb-2">
                                {overUnder ? (
                                  <div className="bg-muted/20 rounded p-1.5">
                                    <p className="text-xs font-bold text-foreground">{overUnder} 2.5</p>
                                    <p className="text-[9px] text-muted-foreground">Goals</p>
                                  </div>
                                ) : <div />}
                                {btts ? (
                                  <div className="bg-muted/20 rounded p-1.5">
                                    <p className="text-xs font-bold text-foreground">{btts}</p>
                                    <p className="text-[9px] text-muted-foreground">BTTS</p>
                                  </div>
                                ) : <div />}
                              </div>
                            )}
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Brain className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-semibold text-primary">Advanced AI Analysis</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Confidence</span>
                                <p className="font-bold text-foreground">{displayConfidence(r.pick.confidence)}%</p>
                              </div>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                <span className="font-medium text-foreground">AI Insight:</span>{" "}
                                {(() => {
                                  const dbText = r.pick.analysis;
                                  const text = isPlaceholderAnalysis(dbText)
                                    ? buildWCAIInsight({
                                        home: r.pick.home_team,
                                        away: r.pick.away_team,
                                        homeWin: r.pick.home_win ?? 0,
                                        draw: r.pick.draw ?? 0,
                                        awayWin: r.pick.away_win ?? 0,
                                        predictedScore: r.pick.home_team === "Netherlands" && r.pick.away_team === "Japan" ? "2-1" : r.pick.predicted_score,
                                        confidence: displayConfidence(r.pick.confidence),
                                      })
                                    : dbText as string;
                                  return text.length > 220 ? text.slice(0, 220) + "…" : text;
                                })()}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">No AI pick stored for this match.</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* ==================== BRACKET ==================== */}
        <TabsContent value="bracket" className="mt-0">
          <WorldCupBracket onGoToGroups={() => setActiveTab("standings")} />
        </TabsContent>

        {/* ==================== PREDICT CHAMPION ==================== */}
        <TabsContent value="champion" className="mt-0">
          {isAndroidApp ? (
            <ChampionPicker />
          ) : (
            <div className="relative">
              {/* Web preview: read-only ChampionPicker with voting gated behind app CTA */}
              <div className="pointer-events-none select-none opacity-90">
                <ChampionPicker />
              </div>
              <div className="absolute inset-0 flex items-start justify-center pt-6 pb-4 px-3 bg-gradient-to-b from-background/40 via-background/85 to-background">
                <Card className="w-full max-w-sm border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-card shadow-2xl shadow-fuchsia-500/10">
                  <div className="p-5 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-fuchsia-400 font-semibold mb-1">App-only feature</p>
                      <h3 className="text-base font-bold text-foreground leading-tight">
                        Voting is available only in the app
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Browse all teams and the live community leaderboard here. To <strong>cast your pick</strong> and win <span className="text-amber-400 font-semibold">1 month FREE Premium</span>, download the app.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { emoji: "🗳️", label: "Vote" },
                        { emoji: "🏆", label: "Win Premium" },
                        { emoji: "🎖️", label: "Badge" },
                      ].map((f) => (
                        <div key={f.label} className="py-2 rounded-lg bg-muted/30 border border-border/50">
                          <span className="text-base">{f.emoji}</span>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{f.label}</p>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={openPlayStore}
                      className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white font-semibold"
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Download the App & Vote
                    </Button>
                    <p className="text-[9px] text-muted-foreground">
                      Leaderboard updates live for everyone — even on web.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== MATCHES ==================== */}
        <TabsContent value="matches" className="mt-0 px-3">
          <div className="mt-4">
          {/* App: matches tab is free for all users; Web: existing lock rules */}
          {!isApp && !isPro ? (
            <AppLockOverlay message="Live match tracking available in app only" buttonText="Open App to Unlock" />
          ) : (
            <section className="mb-5">
              <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-destructive" /> Live & Today
              </h2>
              <WCLiveNowSection />
            </section>
          )}

          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Match Schedule (CET)
          </h2>
            <div className="flex gap-2 mb-3">
              {([
                { key: "md1", label: "Round 1" },
                { key: "md2", label: "Round 2" },
                { key: "md3", label: "Round 3" },
              ] as const).map(f => (
                <Button key={f.key} size="sm" variant={matchesFilter === f.key ? "default" : "outline"}
                  className="text-[11px] h-7 px-3" onClick={() => setMatchesFilter(f.key)}>
                  {f.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {(matchesByDay[matchesFilter] || []).length > 0 ? (
                matchesByDay[matchesFilter].map((m, i) => {
                  const result = lookupWCResult(wcResults, m.home, m.away);
                  const isFinished = !!result?.finished;
                  return (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[9px]">Group {m.group}</Badge>
                      <div className="flex items-center gap-2">
                        {isFinished && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                            FT
                          </Badge>
                        )}
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {m.city}
                        </div>
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
                        {result ? (
                          <>
                            <p className="text-[10px] text-muted-foreground">{m.date}</p>
                            <p className="text-lg font-extrabold text-emerald-400 leading-none">
                              {result.homeScore} - {result.awayScore}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground">{m.date}</p>
                            <p className="text-sm font-bold text-primary">{m.time}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                  );
                })
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
                  const findLive = (t: string) => {
                    const target = norm(t);
                    return liveGroup?.find(lt => {
                      const ln = norm(lt.team);
                      return ln === target
                        || lt.team.toLowerCase().includes(t.toLowerCase())
                        || t.toLowerCase().includes(lt.team.toLowerCase());
                    });
                  };
                  const sortedTeams = [...teams].sort((a, b) => {
                    const la = findLive(a);
                    const lb = findLive(b);
                    const pa = la?.points ?? 0, pb = lb?.points ?? 0;
                    if (pb !== pa) return pb - pa;
                    const gda = la?.goalsDiff ?? 0, gdb = lb?.goalsDiff ?? 0;
                    if (gdb !== gda) return gdb - gda;
                    const wa = la?.win ?? 0, wb = lb?.win ?? 0;
                    return wb - wa;
                  });
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
                        {sortedTeams.map((t, idx) => {
                          const td = TEAMS[t];
                          const live = findLive(t);
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
                                 {td && <TeamFlag code={td.code} size="sm" />} {t === "United States" ? "USA" : t}
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
        {/* ==================== TOP PLAYERS ==================== */}
        <TabsContent value="top-players" className="mt-0 px-3">
          {/* Web Free: locked */}
          {!isApp && !isPro && (
            <div className="mt-4">
              <AppLockOverlay message="Top Players stats available in app" />
            </div>
          )}
          {(isApp || isPro) && <WCTopPlayersTab />}
        </TabsContent>

        {/* ==================== TOURNAMENT STATS ==================== */}
        <TabsContent value="stats" className="mt-0 px-3">
          <WCTournamentStatsTab />
        </TabsContent>
      </Tabs>

    </div>
  );
}
