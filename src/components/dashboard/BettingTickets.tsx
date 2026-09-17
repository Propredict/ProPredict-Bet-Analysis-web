import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2, ChevronRight, Crosshair, Lightbulb, ArrowRight, ShoppingBag } from "lucide-react";
import { startSureOddsPurchase } from "@/lib/sureOddsPurchase";
import { trackSureOddsEvent } from "@/lib/sureOddsAnalytics";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useTickets } from "@/hooks/useTickets";
import { useTicketAccuracy } from "@/hooks/useTicketAccuracy";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";

import TicketCard, { type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";

import dailyFreeTicketCard from "@/assets/daily-free-ticket-card-updated.png";
import premiumTicketCard from "@/assets/premium-ticket-card-updated.png";
import sureOddsStadiumCard from "@/assets/sure-odds-stadium-card.jpg";
import dailyTipsCard from "@/assets/daily-tips-card.jpg";
import premiumTipsCard from "@/assets/premium-tips-card.jpg";

type TabType = "daily" | "exclusive" | "premium";

function mapDbTicket(db: any): BettingTicket {
  return {
    id: db.id,
    title: db.title,
    matchCount: db.matches?.length ?? 0,
    status: db.result ?? "pending",
    totalOdds: db.total_odds,
    tier: db.tier,
    matches: (db.matches ?? []).map((m: any) => ({
      name: m.match_name ?? "",
      prediction: m.prediction ?? "",
      odds: m.odds ?? 1,
    })),
  };
}

const TAB_ROUTES: Record<TabType, string> = {
  daily: "/daily-predictions",
  exclusive: "/sure-odds",
  premium: "/premium-predictions"
};

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { tickets: dbTickets = [], isLoading } = useTickets(false);
  const { data: accuracyData = [] } = useTicketAccuracy();
  const { isAndroidApp } = usePlatform();

  // Dashboard shows ONLY today's tickets — older ones go to history pages
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayDbTickets = dbTickets.filter((t: any) => t.ticket_date === todayDate && t.category !== "multi_risk" && t.category !== "sure_odds");
  const filtered = todayDbTickets
    .filter((t: any) => t.tier === activeTab)
    .map(mapDbTicket);
  const displayedTickets = filtered.slice(0, 3);
  const hasMoreTickets = filtered.length > 3;

  // Count only today's tickets per tier
  const todayTicketCountByTier = (tierId: string) =>
    todayDbTickets.filter((t: any) => t.tier === tierId).length;

  const accuracy = accuracyData.find((a) => a.tier === activeTab)?.accuracy ?? 0;

  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    },
    onUpgradePremium: () => {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    },
  });

  const tabs = [
    { id: "daily", label: "Daily", subtitle: "Free", icon: Sparkles },
    { id: "exclusive", label: "Sure Odds 2+", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown },
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 border-2";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-primary bg-primary/20 shadow-[0_0_15px_rgba(0,148,230,0.25)]")
          : cn(baseStyles, "border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-blue-700 bg-blue-700/20 shadow-[0_0_15px_rgba(0,148,230,0.25)]")
          : cn(baseStyles, "border-blue-700/30 bg-blue-700/8 hover:bg-blue-700/15 hover:border-blue-700/50");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-primary bg-primary/20 shadow-[0_0_15px_rgba(0,148,230,0.25)]")
          : cn(baseStyles, "border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50");
      default:
        return cn(baseStyles, "border-border");
    }
  };

  const getTextColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary";
      case "exclusive": return "text-blue-600";
      case "premium": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getSubtitleColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary/70";
      case "exclusive": return "text-blue-600/70";
      case "premium": return "text-primary/70";
      default: return "text-muted-foreground";
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily Ticket / Pogledaj sve Daily Ticket";
      case "exclusive": return "See all Sure Odds 2+ Tickets / Pogledaj sve Sure Odds 2+ Tickets";
      case "premium": return "See all Premium Ticket / Pogledaj sve Premium Ticket";
    }
  };

  // ----- Helpers used by both layouts -----
  const renderTicket = (ticket: BettingTicket) => {
    const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
    const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
    return (
      <TicketCard
        key={ticket.id}
        ticket={ticket}
        isLocked={isLocked}
        unlockMethod={unlockMethod}
        isUnlocking={unlockingId === ticket.id}
        onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
      />
    );
  };

  // Shared dashboard layout for web and Android.
  {
    const freeCount = todayDbTickets.filter((t: any) => t.tier === "daily").length;
    const premiumCount = todayDbTickets.filter((t: any) => t.tier === "premium").length;

    const topCards = [
      {
        img: dailyFreeTicketCard,
        alt: "Daily Free Ticket — Today's AI selected matches, free for all users",
        to: "/tickets",
        border: "border-primary/50 hover:border-primary",
        shadow: "shadow-primary/20 hover:shadow-primary/35",
        count: freeCount,
        countClass: "bg-card/95 text-primary",
      },
      {
        img: premiumTicketCard,
        alt: "Premium Ticket — Exclusive picks, higher odds, only for Premium members",
        to: "/premium-tickets",
        border: "border-primary/70 hover:border-primary",
        shadow: "shadow-primary/30 hover:shadow-primary/45",
        count: premiumCount,
        countClass: "bg-card/95 text-primary",
      },
    ];

    const tipCards = [
      {
        img: dailyTipsCard,
        alt: "Daily Tips — Today's best value picks from our AI",
        titleA: "Daily",
        titleB: "Tips",
        titleBClass: "text-sky-300",
        subtitle: "Dnevne predikcije",
        desc: "Today's best value picks from our AI.",
        to: "/single-tips",
        border: "border-primary/50 hover:border-primary",
        shadow: "shadow-primary/20 hover:shadow-primary/35",
      },
      {
        img: premiumTipsCard,
        alt: "Premium Tips — Top picks for Premium members. Maximum edge.",
        titleA: "Premium",
        titleB: "Tips",
        titleBClass: "text-violet-300",
        subtitle: "Premium predikcije",
        desc: "Top picks for Premium members. Maximum edge.",
        to: "/single-tips?view=premium",
        border: "border-violet-500/50 hover:border-violet-500",
        shadow: "shadow-violet-500/20 hover:shadow-violet-500/35",
      },
    ];

    const renderTipCard = (item: (typeof tipCards)[number]) => (
      <Button
        key={item.to}
        type="button"
        variant="ghost"
        onClick={() => navigate(item.to)}
        className={cn(
          "group relative block h-auto w-full overflow-hidden rounded-2xl border-2 p-0 text-left shadow-lg transition-all hover:-translate-y-1 hover:bg-transparent hover:shadow-2xl",
          item.border,
          item.shadow
        )}
      >
        <img
          src={item.img}
          alt={item.alt}
          loading="lazy"
          className="aspect-[2/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-sidebar/95 via-sidebar/45 to-transparent" />
        <span className="absolute inset-y-0 left-0 flex w-[64%] flex-col justify-center gap-1 p-4 sm:gap-1.5 sm:p-6">
          <span className="text-2xl font-black uppercase leading-none text-sidebar-foreground drop-shadow-md sm:text-4xl">
            {item.titleA}{" "}
            <span className={item.titleBClass}>{item.titleB}</span>
          </span>
          <span className="text-sm font-black leading-tight text-sidebar-foreground drop-shadow-sm sm:text-lg">
            {item.subtitle}
          </span>
          <span className="text-xs font-extrabold leading-snug text-sidebar-foreground/90 drop-shadow-sm sm:text-base">
            {item.desc}
          </span>
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-black text-foreground shadow-md sm:px-4 sm:text-sm">
            Open / Otvori
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
          </span>
        </span>
      </Button>
    );

    return (
      <section className="space-y-4">
        {/* Row 1 — Daily & Premium ticket kockice (full-image cards) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {topCards.map((card) => (
            <button
              key={card.to}
              type="button"
              onClick={() => navigate(card.to)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 text-left shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl",
                card.border,
                card.shadow
              )}
            >
              <img
                src={card.img}
                alt={card.alt}
                loading="lazy"
                width={1152}
                height={576}
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {card.count > 0 && (
                <span
                  className={cn(
                    "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-md",
                    card.countClass
                  )}
                >
                  {card.count} {card.count === 1 ? "ticket" : "tickets"} today / danas
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Row 2 — Sure Odds 2+ full-width kocka (bigger, ball symbol, open + buy) */}
        <div className="group relative block min-h-52 w-full overflow-hidden rounded-2xl border-2 border-success/60 bg-sidebar text-left shadow-lg shadow-success/20 transition-all hover:-translate-y-1 hover:border-success hover:shadow-2xl hover:shadow-success/35 sm:min-h-64">
          <img
            src={sureOddsStadiumCard}
            alt="Sure Odds 2+ Ticket — High confidence Ticket. Sigurna kvota >2."
            loading="lazy"
            width={1536}
            height={640}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar/80 via-sidebar/20 to-transparent" />
          <div className="relative flex min-h-52 w-[68%] flex-col justify-center gap-2 p-4 sm:min-h-64 sm:gap-3 sm:p-8">
            <span className="text-3xl font-black uppercase leading-none text-sidebar-foreground drop-shadow-md sm:text-5xl">
              Sure <span className="text-success">Odds 2+</span> Ticket
            </span>
            <span className="text-xs font-extrabold leading-snug text-sidebar-foreground/90 sm:text-lg">
              High confidence Ticket / Sigurna kvota &gt;2
            </span>
            <span className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/sure-odds")}
                className="h-9 gap-1.5 rounded-lg bg-card px-3 text-xs font-black text-foreground shadow-md hover:bg-card/90 sm:h-10 sm:px-4 sm:text-sm"
              >
                Open / Otvori
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void trackSureOddsEvent("cta_click", "dashboard");
                  startSureOddsPurchase(undefined, "dashboard");
                }}
                className="h-9 gap-1.5 rounded-lg bg-success px-3 text-xs font-black text-success-foreground shadow-md transition-transform hover:scale-[1.03] hover:bg-success/90 sm:h-10 sm:px-4 sm:text-sm"
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Get Ticket / Kupi tiket
              </Button>
            </span>
          </div>
        </div>

        {/* Row 3 — Daily Tips & Premium Tips kocke (same size as ticket cards) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tipCards.map(renderTipCard)}
        </div>
      </section>
    );
  }

  // --- ANDROID: keep existing tabbed layout ---
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(0,148,230,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daily Ticket</h2>
            <p className="text-[9px] text-muted-foreground">Multi-match combinations</p>
          </div>
        </div>
        {accuracy > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] text-muted-foreground">Accuracy</span>
            <span className="text-xs font-bold text-primary">{accuracy}%</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-xl bg-secondary/30">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = todayTicketCountByTier(tab.id);
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

      {/* Tickets Content - Limited to 4 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedTickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedTickets.map((ticket) => renderTicket(ticket))}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-blue-700/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-primary/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} AI Combos available
            </p>
          </div>
        </Card>
      )}

      {/* Centered See All CTA */}
      {filtered.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-6 group bg-gradient-to-r from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700 text-primary-foreground text-xs border-0 rounded-full"
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

