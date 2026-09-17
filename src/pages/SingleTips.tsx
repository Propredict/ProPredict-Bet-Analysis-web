import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3, Crown, Gem, Lightbulb, Loader2, RefreshCw, Target } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdSlot from "@/components/ads/AdSlot";
import { TipCard } from "@/components/dashboard/TipCard";
import { FreeInAppPopup } from "@/components/FreeInAppPopup";
import { FreeUserUpsellModal } from "@/components/FreeUserUpsellModal";
import { PricingModal } from "@/components/PricingModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTips } from "@/hooks/useTips";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { formatKickoff, formatKickoffParts } from "@/lib/formatKickoff";
import type { Tip } from "@/types/admin";
import { toast } from "sonner";

type TipView = "daily" | "premium" | "risk" | "diamond";

const views: Array<{ value: TipView; label: string; subtitle: string; icon: typeof Lightbulb }> = [
  { value: "daily", label: "Free Tips", subtitle: "Today's free match predictions, updated every morning.", icon: Lightbulb },
  { value: "premium", label: "Premium Tips", subtitle: "Exclusive premium match predictions for today.", icon: Crown },
  { value: "risk", label: "Risk of the Day", subtitle: "Today's high-risk, high-odds pick.", icon: Target },
  { value: "diamond", label: "Diamond Tips", subtitle: "Today's standout diamond pick.", icon: Gem },
];

function isTipView(value: string | null): value is TipView {
  return value === "daily" || value === "premium" || value === "risk" || value === "diamond";
}

export default function SingleTips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tips, isLoading, refetch } = useTips(false);
  const { matches: liveMatches } = useLiveScores({ dateMode: "today", statusFilter: "all" });
  const { canAccess, getUnlockMethod, plan, isAdmin, refetch: refetchPlan } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const requestedView = searchParams.get("view");
  const activeView: TipView = isTipView(requestedView) ? requestedView : "daily";
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeHighlight, setUpgradeHighlight] = useState<"basic" | "premium" | undefined>();
  const [freeInAppOpen, setFreeInAppOpen] = useState(false);
  const highlightId = searchParams.get("highlight");
  const planRequired = searchParams.get("plan_required");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const groups = useMemo(() => ({
    daily: tips.filter((tip) => (tip.tier === "free" || tip.tier === "daily") && tip.tip_date === today),
    premium: tips.filter((tip) => tip.tier === "premium" && tip.tip_date === today && (!tip.category || tip.category === "standard" || tip.category === "ai_premium")),
    risk: tips.filter((tip) => tip.category === "risk_of_day" && tip.tip_date === today),
    diamond: tips.filter((tip) => tip.category === "diamond_pick" && tip.tip_date === today),
  }), [tips, today]);

  useEffect(() => {
    if (!highlightId || isLoading) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`tip-${highlightId}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("push-highlight");
      window.setTimeout(() => element.classList.remove("push-highlight"), 4000);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [groups, highlightId, isLoading]);

  useEffect(() => {
    if (!planRequired) return;
    if (planRequired === "premium" && plan !== "premium") {
      setUpgradeHighlight("premium");
      setUpgradeModalOpen(true);
    } else if (planRequired === "pro" && plan === "free") {
      setUpgradeHighlight("basic");
      setUpgradeModalOpen(true);
    }
  }, [planRequired, plan]);

  const refresh = async () => {
    await Promise.all([refetch(), refetchPlan()]);
    toast.success("Predictions refreshed");
  };

  const accessTierFor = (view: TipView): ContentTier => {
    if (view === "daily") return "daily";
    if (view === "risk" && plan === "basic") return "exclusive";
    return "premium";
  };

  const currentTips = groups[activeView];
  const currentMeta = views.find((view) => view.value === activeView) ?? views[0];
  const CurrentIcon = currentMeta.icon;
  const accessTier = accessTierFor(activeView);
  const unlockedCount = currentTips.filter((tip) => {
    if (activeView === "daily" && tip.tier === "free") return canAccess("free", "tip", tip.id);
    return canAccess(accessTier, "tip", tip.id);
  }).length;
  const showSubscribe = activeView !== "daily" && !isAdmin && plan !== "premium" && !(activeView === "risk" && plan === "basic");

  const logoMap = useMemo(() => {
    const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    const map = new Map<string, string>();
    liveMatches.forEach((match) => {
      if (match.homeLogo) map.set(normalize(match.homeTeam), match.homeLogo);
      if (match.awayLogo) map.set(normalize(match.awayTeam), match.awayLogo);
    });
    return map;
  }, [liveMatches]);

  const renderTip = (tip: Tip, index: number) => {
    const tier = activeView === "daily" && tip.tier === "free" ? "free" : accessTier;
    const unlockMethod = getUnlockMethod(tier, "tip", tip.id);
    const isLocked = unlockMethod?.type !== "unlocked";
    const parts = formatKickoffParts((tip as any).match_date, (tip as any).match_time, tip.created_at_ts);
    return (
      <React.Fragment key={tip.id}>
        <div id={`tip-${tip.id}`}>
          <TipCard
            tip={{
              id: tip.id,
              homeTeam: tip.home_team,
              awayTeam: tip.away_team,
              league: tip.league,
              prediction: tip.prediction,
              odds: tip.odds,
              confidence: tip.confidence ?? 0,
              kickoff: formatKickoff((tip as any).match_date, (tip as any).match_time, tip.created_at_ts),
              kickoffDate: parts.date,
              kickoffTime: parts.time,
              tier: tip.tier,
              result: tip.result,
              finalResult: tip.final_result ?? null,
              extraNote: (activeView === "risk" || activeView === "diamond") && tip.ai_prediction
                ? { label: "AI Top Scores", value: String(tip.ai_prediction) }
                : null,
              homeLogo: logoMap.get(tip.home_team.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")) ?? null,
              awayLogo: logoMap.get(tip.away_team.toLocaleLowerCase().replace(/[^a-z0-9]/g, "")) ?? null,
            }}
            isLocked={isLocked}
            unlockMethod={unlockMethod}
            onUnlockClick={() => handleUnlock("tip", tip.id, tier)}
            onSecondaryUnlock={activeView === "risk" ? () => setFreeInAppOpen(true) : undefined}
            isUnlocking={unlockingId === tip.id}
            lockedCTAText={activeView === "risk" ? "See now / Pogledaj Tip" : undefined}
            lockedCTABrand={activeView === "risk" ? "pro" : "premium"}
            lockedLabel={activeView === "risk" ? "Risk of the Day" : activeView === "diamond" ? "Diamond Pick" : undefined}
          />
        </div>
        {(index + 1) % 5 === 0 && Math.floor((index + 1) / 5) <= 2 && index < currentTips.length - 1 ? <AdSlot className="col-span-full" /> : null}
      </React.Fragment>
    );
  };

  return (
    <>
      <FreeUserUpsellModal />
      <Helmet>
        <title>{currentMeta.label} – Football Predictions | ProPredict</title>
        <meta name="description" content={`${currentMeta.subtitle} Free, Premium, Risk and Diamond football predictions on ProPredict.`} />
      </Helmet>

      <div className="section-gap min-w-0">
        <section className="overflow-hidden rounded-xl border-2 border-primary/55 bg-sidebar shadow-xl">
          <div className="bg-gradient-to-r from-sidebar via-sidebar-accent to-primary/80 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <CurrentIcon className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase">Match predictions</span>
                </div>
                <h1 className="text-2xl font-black text-sidebar-foreground sm:text-3xl">{currentMeta.label}</h1>
                <p className="mt-1 text-sm text-sidebar-foreground/70">{currentMeta.subtitle}</p>
              </div>
              <Button variant="outline" size="icon" className="shrink-0 border-primary/50 bg-sidebar/45 text-sidebar-foreground hover:bg-primary/20" onClick={refresh} aria-label="Refresh predictions">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary/45 bg-card p-4 shadow-md">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-foreground sm:text-xl">{currentMeta.label}</h2>
              <p className="text-xs text-muted-foreground">Today's selected match analysis</p>
            </div>
          </div>
          {showSubscribe ? (
            <Button className="shrink-0 bg-primary text-primary-foreground" onClick={() => navigate("/get-premium")}>
              <Crown className="mr-1.5 h-4 w-4" /> Premium
            </Button>
          ) : null}
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Card className="border-primary/35 bg-card p-3">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><div><p className="text-lg font-black text-foreground">{currentTips.length}</p><p className="text-xs text-muted-foreground">Predictions</p></div></div>
          </Card>
          <Card className="border-primary/35 bg-card p-3">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><div><p className="text-lg font-black text-foreground">{unlockedCount}</p><p className="text-xs text-muted-foreground">Available</p></div></div>
          </Card>
          <Card className="col-span-2 border-primary/35 bg-card p-3 sm:col-span-1">
            <div className="flex items-center gap-2"><CurrentIcon className="h-4 w-4 text-primary" /><div><p className="text-sm font-black text-foreground">Updated daily</p><p className="text-xs text-muted-foreground">Fresh analysis</p></div></div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {isLoading ? (
            <Card className="col-span-full flex min-h-48 flex-col items-center justify-center border-primary/30 bg-card text-muted-foreground"><Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" /><p>Loading predictions...</p></Card>
          ) : currentTips.length === 0 ? (
            <Card className="col-span-full flex min-h-48 flex-col items-center justify-center border-primary/30 bg-card px-5 text-center text-muted-foreground">
              <CurrentIcon className="mb-3 h-10 w-10 text-primary/45" />
              <p className="font-semibold text-foreground">No {currentMeta.label.toLowerCase()} available yet</p>
              <p className="mt-1 text-sm">Fresh predictions are generated every morning at 7:00 AM CET.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Try Again</Button>
            </Card>
          ) : currentTips.map(renderTip)}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.</p>
      </div>

      <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
      <FreeInAppPopup open={freeInAppOpen} onClose={() => setFreeInAppOpen(false)} onContinueWithPro={() => navigate("/get-premium")} />
    </>
  );
}
