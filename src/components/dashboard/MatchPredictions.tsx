import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Sparkles, Star, Crown, Users, Loader2, ChevronRight, Gem, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { TipCard, type Tip } from "./TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";
import { usePlatform } from "@/hooks/usePlatform";

type TabType = "daily" | "exclusive" | "premium";

function mapDbTipToTip(dbTip: any): Tip {
  return {
    id: dbTip.id,
    homeTeam: dbTip.home_team,
    awayTeam: dbTip.away_team,
    league: dbTip.league,
    prediction: dbTip.prediction,
    odds: dbTip.odds,
    confidence: dbTip.confidence ?? 0,
    kickoff: dbTip.created_at_ts ? new Date(dbTip.created_at_ts).toLocaleDateString() : "",
    tier: dbTip.tier as ContentTier,
    result: dbTip.result as Tip["result"]
  };
}

const TAB_ROUTES: Record<TabType, string> = {
  daily: "/daily-analysis",
  exclusive: "/pro-analysis",
  premium: "/premium-analysis"
};

export function MatchPredictions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();
  const { isAndroidApp } = usePlatform();
  
  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    },
    onUpgradePremium: () => {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    }
  });

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [], isLoading } = tipsQuery;

  // Dashboard shows ONLY today's tips — older ones go to history pages
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayDbTips = dbTips.filter((t: any) => t.tip_date === todayDate);
  const tips = todayDbTips.map(mapDbTipToTip);
  const filteredTips = tips.filter(t => t.tier === activeTab);
  const displayedTips = filteredTips.slice(0, 3);
  const hasMoreTips = filteredTips.length > 3;

  // Count only today's tips per tier (todayDate already defined above)
  const todayTipCountByTier = (tierId: string) =>
    todayDbTips.filter((t: any) => t.tier === tierId).length;

  // ----- Shared renderer -----
  const renderTip = (tip: Tip) => {
    const isLocked = !canAccess(tip.tier, "tip", tip.id);
    const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);
    return (
      <TipCard
        key={tip.id}
        tip={tip}
        isLocked={isLocked}
        unlockMethod={unlockMethod}
        isUnlocking={unlockingId === tip.id}
        onUnlockClick={() => handleUnlock("tip", tip.id, tip.tier)}
      />
    );
  };

  const tabs = [
    { id: "daily", label: "Daily", subtitle: "Free", icon: Sparkles },
    { id: "exclusive", label: "Exclusive", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 border-2";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-primary bg-primary/20 shadow-[0_0_15px_rgba(15,155,142,0.25)]")
          : cn(baseStyles, "border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]")
          : cn(baseStyles, "border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-500/50");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-fuchsia-500 bg-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.25)]")
          : cn(baseStyles, "border-fuchsia-500/30 bg-fuchsia-500/8 hover:bg-fuchsia-500/15 hover:border-fuchsia-500/50");
      default:
        return cn(baseStyles, "border-border");
    }
  };

  const getTextColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary";
      case "exclusive": return "text-amber-400";
      case "premium": return "text-fuchsia-400";
      default: return "text-muted-foreground";
    }
  };

  const getSubtitleColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary/70";
      case "exclusive": return "text-amber-400/70";
      case "premium": return "text-fuchsia-400/70";
      default: return "text-muted-foreground";
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily Predictions";
      case "exclusive": return "See all Pro Predictions";
      case "premium": return "See all Premium Predictions";
    }
  };

  // --- WEB: vertical sections (Free / Pro / Premium) ---
  if (!isAndroidApp) {
    // Helper: stable match key to dedupe the same fixture across sections
    const matchKey = (t: any) =>
      `${(t.home_team ?? t.homeTeam ?? "").toLowerCase().trim()}__${(t.away_team ?? t.awayTeam ?? "").toLowerCase().trim()}`;

    // Reserve specialized matches first so they don't appear elsewhere.
    // Priority of ownership: Diamond > Risk of the Day > Premium > Pro > Daily.
    const diamondDb = todayDbTips.filter((t: any) => t.category === "diamond_pick");
    const riskDb = todayDbTips.filter((t: any) => t.category === "risk_of_day");

    const reserved = new Set<string>();
    diamondDb.forEach((t: any) => reserved.add(matchKey(t)));
    riskDb.forEach((t: any) => {
      const k = matchKey(t);
      if (!reserved.has(k)) reserved.add(k);
    });

    const diamondTips = diamondDb.map(mapDbTipToTip).slice(0, 2);
    const riskTips = riskDb.map(mapDbTipToTip).slice(0, 2);

    // Premium — exclude any match already used by Diamond / Risk
    const premiumTips = todayDbTips
      .filter((t: any) => t.tier === "premium" && !reserved.has(matchKey(t)))
      .map(mapDbTipToTip)
      .slice(0, 2);
    premiumTips.forEach((t) => reserved.add(`${t.homeTeam.toLowerCase().trim()}__${t.awayTeam.toLowerCase().trim()}`));

    // Pro — match Pro Insights: show exclusive tier tips, but prefer non-specialized ones first.
    const availableExclusiveTips = todayDbTips.filter((t: any) => t.tier === "exclusive" && !reserved.has(matchKey(t)));
    const exclusiveTips = (availableExclusiveTips.length > 0
      ? availableExclusiveTips
      : todayDbTips.filter((t: any) => t.tier === "exclusive"))
      .map(mapDbTipToTip)
      .slice(0, 2);
    const proTips = exclusiveTips;
    proTips.forEach((t) => reserved.add(`${t.homeTeam.toLowerCase().trim()}__${t.awayTeam.toLowerCase().trim()}`));

    // Daily (Free) — include both 'daily' and 'free' tier, exclude reserved
    const dailyTips = todayDbTips
      .filter((t: any) => (t.tier === "daily" || t.tier === "free") && !reserved.has(matchKey(t)))
      .map(mapDbTipToTip)
      .slice(0, 2);

    return (
      <section className="space-y-5">
        {/* Section Header — centered bold title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center tracking-tight pt-2">
          Today's Picks
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* SECTION 1: FREE / Daily Tips */}
            <TipTierSection
              title="Daily Tips"
              subtitle="Open access · everyday value"
              badgeIcon={Sparkles}
              badgeLabel="Free"
              tone="free"
              ctaLabel="See all Daily Tips"
              onCta={() => navigate("/daily-analysis")}
              empty="No Daily predictions available"
              items={dailyTips}
              renderItem={renderTip}
            />

            {/* SECTION 2: PRO — Exclusive only */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-3 sm:p-4 space-y-3">
              <div className="text-center space-y-1">
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
                  Pro Picks
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Higher confidence · sharper edge
                </p>
              </div>

              {proTips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {proTips.map(renderTip)}
                </div>
              ) : (
                <Card className="empty-state-compact bg-card/40 border-border/40">
                  <div className="flex flex-col items-center gap-1">
                    <Star className="h-5 w-5 text-amber-500/50" />
                    <p className="text-[10px] text-muted-foreground">No Pro predictions available</p>
                  </div>
                </Card>
              )}

              <div className="flex justify-center pt-1">
                <Button
                  size="sm"
                  className="px-5 group bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xs border-0 rounded-full"
                  onClick={() => navigate("/pro-analysis")}
                >
                  <span>See all Pro Tips</span>
                  <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>

            {/* SECTION 2b: RISK OF THE DAY — standalone */}
            {riskTips.length > 0 && (
              <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent p-3 sm:p-4 space-y-3">
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
                    <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                    Risk of the Day
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Bold high-odds pick · for the brave
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {riskTips.map(renderTip)}
                </div>

                <div className="flex justify-center pt-1">
                  <Button
                    size="sm"
                    className="px-5 group bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs border-0 rounded-full"
                    onClick={() => navigate("/risk-of-the-day")}
                  >
                    <span>See Risk of the Day</span>
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* SECTION 3: DIAMOND PICK — standalone */}
            {diamondTips.length > 0 && (
              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent p-3 sm:p-4 space-y-3">
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
                    <Gem className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
                    Diamond Pick
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hand-picked best of the day · highest conviction
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diamondTips.map(renderTip)}
                </div>

                <div className="flex justify-center pt-1">
                  <Button
                    size="sm"
                    className="px-5 group bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white text-xs border-0 rounded-full"
                    onClick={() => navigate("/diamond-pick")}
                  >
                    <span>See Diamond Pick</span>
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* SECTION 4: PREMIUM */}
            <TipTierSection
              title="Premium Tips"
              subtitle="Best AI predictions · maximum edge"
              badgeIcon={Crown}
              badgeLabel="👑 Premium"
              tone="premium"
              ctaLabel="See all Premium Tips"
              onCta={() => navigate("/premium-analysis")}
              empty="No Premium predictions available"
              items={premiumTips}
              renderItem={renderTip}
            />
          </>
        )}

        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          highlightPlan={highlightPlan}
        />
      </section>
    );
  }

  // --- ANDROID: keep existing tabbed layout ---
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="p-1.5 rounded-md bg-primary/20">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary">Daily AI Predictions</h2>
          <p className="text-[9px] text-muted-foreground"></p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-xl bg-secondary/30">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = todayTipCountByTier(tab.id);
          const textColor = getTextColor(tab.id);
          const subtitleColor = getSubtitleColor(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <tab.icon className={cn("h-4 w-4", textColor)} />
                  <span className={cn("font-bold text-sm", textColor)}>{tab.label}</span>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted/50",
                    textColor
                  )}>
                    {count}
                  </span>
                </div>
                <span className={cn("text-[10px] font-medium", subtitleColor)}>{tab.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Social Proof Banner */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-primary/5 border border-primary/10">
        <Users className="h-3 w-3 text-primary/70" />
        <span className="text-[9px] text-muted-foreground">
          <span className="text-primary font-medium">128</span> users unlocked predictions today
        </span>
      </div>

      {/* Tips Content - Limited to 4 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedTips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedTips.map((tip) => renderTip(tip))}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-fuchsia-500/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} predictions available
            </p>
          </div>
        </Card>
      )}

      {/* Centered See All CTA */}
      {filteredTips.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-6 group bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-xs border-0 rounded-full"
            onClick={() => navigate(TAB_ROUTES[activeTab])}
          >
            <span>{getCtaLabel()}</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal} 
        highlightPlan={highlightPlan} 
      />
    </section>
  );
}

/* =======================
   Tip Tier Section (web)
======================= */

type TipTone = "free" | "premium";

const TIP_TONE: Record<TipTone, {
  border: string;
  bg: string;
  badge: string;
  text: string;
  cta: string;
}> = {
  free: {
    border: "border-primary/30",
    bg: "from-primary/10 via-primary/5 to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    text: "text-primary",
    cta: "from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600",
  },
  premium: {
    border: "border-fuchsia-500/30",
    bg: "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
    badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    text: "text-fuchsia-400",
    cta: "from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600",
  },
};

function TipTierSection({
  title,
  subtitle,
  badgeIcon: BadgeIcon,
  badgeLabel,
  tone,
  ctaLabel,
  onCta,
  empty,
  items,
  renderItem,
}: {
  title: string;
  subtitle: string;
  badgeIcon: any;
  badgeLabel: string;
  tone: TipTone;
  ctaLabel: string;
  onCta: () => void;
  empty: string;
  items: Tip[];
  renderItem: (t: Tip) => JSX.Element;
}) {
  const styles = TIP_TONE[tone];

  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 space-y-3 bg-gradient-to-br", styles.border, styles.bg)}>
      <div className="text-center space-y-1">
        <h3 className={cn("text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2")}>
          <BadgeIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", styles.text)} />
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(renderItem)}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/40 border-border/40">
          <div className="flex flex-col items-center gap-1">
            <BadgeIcon className={cn("h-5 w-5 opacity-50", styles.text)} />
            <p className="text-[10px] text-muted-foreground">{empty}</p>
          </div>
        </Card>
      )}

      <div className="flex justify-center pt-1">
        <Button
          size="sm"
          className={cn("px-5 group text-white text-xs border-0 rounded-full bg-gradient-to-r", styles.cta)}
          onClick={onCta}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}