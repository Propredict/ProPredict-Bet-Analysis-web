import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2, ChevronRight, Crosshair, Lightbulb, ArrowRight } from "lucide-react";

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

  // --- WEB: simplified kockice layout — Daily/Premium tickets + tips ---
  if (!isAndroidApp) {
    const freeCount = todayDbTickets.filter((t: any) => t.tier === "daily").length;
    const premiumCount = todayDbTickets.filter((t: any) => t.tier === "premium").length;

    return (
      <section className="space-y-4">
        {/* Row 1 — Daily & Premium ticket kockice */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Daily Free Ticket */}
          <button
            type="button"
            onClick={() => navigate("/tickets")}
            className="group relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-card p-5 text-left shadow-md shadow-primary/10 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/25 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge className="border border-primary/40 bg-primary/10 text-[11px] font-extrabold text-primary">
                Free
              </Badge>
            </div>
            <h3 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-sidebar">
              Daily <span className="text-primary">Free Ticket</span>
            </h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Today's AI selected matches. Free for all users.
            </p>
            {freeCount > 0 && (
              <p className="mt-1 text-xs font-extrabold text-primary">
                {freeCount} {freeCount === 1 ? "ticket" : "tickets"} today / danas
              </p>
            )}
            <span className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:-translate-y-0.5">
              Klikni i otvori <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          {/* Premium Ticket */}
          <button
            type="button"
            onClick={() => navigate("/premium-tickets")}
            className="group relative overflow-hidden rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-sidebar via-sidebar-accent to-primary/80 p-5 text-left shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-xl hover:shadow-primary/30 sm:p-6"
          >
            <div className="pointer-events-none absolute -right-3 -top-3 rotate-12 rounded-xl bg-gradient-to-br from-yellow-300 to-yellow-500 px-4 py-1.5 text-lg font-black tracking-wide text-yellow-900 shadow-lg">
              VIP
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-yellow-900 shadow-md">
                <Crown className="h-5 w-5" />
              </div>
              <Badge className="border border-primary-foreground/40 bg-primary-foreground/10 text-[11px] font-extrabold text-primary-foreground">
                Premium
              </Badge>
            </div>
            <h3 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-primary-foreground">
              Premium <span className="text-yellow-300">Ticket</span>
            </h3>
            <p className="mt-1 text-sm font-medium text-primary-foreground/75">
              Exclusive picks. Higher odds. Only for Premium members.
            </p>
            {premiumCount > 0 && (
              <p className="mt-1 text-xs font-extrabold text-yellow-300">
                {premiumCount} {premiumCount === 1 ? "ticket" : "tickets"} today / danas
              </p>
            )}
            <span className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-extrabold text-primary shadow-md transition-transform group-hover:-translate-y-0.5">
              Klikni i otvori <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>

        {/* Row 2 — Sure Odds 2+ / Daily Tips / Premium Tips kockice */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: "Sure Odds 2+",
              desc: "High confidence picks. Odds 2.00+.",
              cta: "View Sure Odds",
              icon: Crosshair,
              to: "/sure-odds",
            },
            {
              title: "Daily Tips",
              desc: "Today's best value picks from our AI.",
              cta: "View Daily Tips",
              icon: Lightbulb,
              to: "/single-tips",
            },
            {
              title: "Premium Tips",
              desc: "Top picks for Premium members. Maximum edge.",
              cta: "View Premium Tips",
              icon: Crown,
              to: "/single-tips?view=premium",
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate(item.to)}
              className="group flex flex-col rounded-2xl border-2 border-primary/30 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-md sm:p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="mt-3 text-base font-extrabold uppercase tracking-tight text-sidebar">
                {item.title}
              </span>
              <span className="mt-1 flex-1 text-xs font-medium leading-relaxed text-muted-foreground">
                {item.desc}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-primary">
                {item.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
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

