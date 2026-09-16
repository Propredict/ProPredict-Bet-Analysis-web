import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2, ChevronRight } from "lucide-react";

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

  // --- WEB: two entry cards (Free / Premium) ---
  if (!isAndroidApp) {
    const freeCount = todayDbTickets.filter((t: any) => t.tier === "daily").length;
    const premiumCount = todayDbTickets.filter((t: any) => t.tier === "premium").length;

    if (!isLoading && freeCount === 0 && premiumCount === 0) return null;

    return (
      <section className="space-y-5">
        {/* Section Header — centered bold title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center tracking-tight pt-2">
          Today's Ticket / Današnji Tiketi
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Ticket card */}
            <button
              type="button"
              onClick={() => navigate("/tickets")}
              className="group rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-5 text-left shadow-md shadow-primary/10 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge className="border border-primary/40 bg-primary/10 text-[11px] font-bold text-primary">
                  Free
                </Badge>
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-sidebar">Free Ticket</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Besplatni tiket · otvoren pristup</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {freeCount} {freeCount === 1 ? "ticket" : "tickets"} today / danas
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-primary">
                  Open / Otvori
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>

            {/* Premium Ticket card */}
            <button
              type="button"
              onClick={() => navigate("/premium-tickets")}
              className="group rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-sidebar via-sidebar-accent to-primary/70 p-5 text-left shadow-lg shadow-primary/20 transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/30">
                  <Crown className="h-5 w-5" />
                </div>
                <Badge className="border border-primary-foreground/40 bg-primary-foreground/10 text-[11px] font-bold text-primary-foreground">
                  Premium
                </Badge>
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-primary-foreground">Premium Ticket</h3>
              <p className="mt-0.5 text-xs text-primary-foreground/70">Premium tiket · samo za članove</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-foreground/70">
                  {premiumCount} {premiumCount === 1 ? "ticket" : "tickets"} today / danas
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-primary-foreground">
                  Open / Otvori
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
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

/* =======================
   Ticket Tier Section (web)
======================= */

const TICKET_TONE: Record<TicketTone, {
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
    cta: "from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700",
  },
  pro: {
    border: "border-blue-700/30",
    bg: "from-blue-700/10 via-blue-700/5 to-transparent",
    badge: "bg-blue-700/15 text-blue-600 border-blue-700/30",
    text: "text-blue-600",
    cta: "from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700",
  },
  premium: {
    border: "border-primary/30",
    bg: "from-primary/10 via-primary/5 to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    text: "text-primary",
    cta: "from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700",
  },
};

function TicketTierSection({
  title,
  subtitle,
  badgeIcon: BadgeIcon,
  badgeLabel,
  tone,
  ctaLabel,
  onCta,
  empty,
  tickets,
  renderTicket,
}: {
  title: string;
  subtitle: string;
  badgeIcon: any;
  badgeLabel: string;
  tone: TicketTone;
  ctaLabel: string;
  onCta: () => void;
  empty: string;
  tickets: BettingTicket[];
  renderTicket: (t: BettingTicket) => JSX.Element;
}) {
  const styles = TICKET_TONE[tone];

  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 space-y-3 bg-gradient-to-br", styles.border, styles.bg)}>
      <div className="text-center space-y-1">
        <h3 className={cn("text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2")}>
          <BadgeIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", styles.text)} />
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tickets.map(renderTicket)}
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
          className={cn("px-5 group text-primary-foreground text-xs border-0 rounded-full bg-gradient-to-r", styles.cta)}
          onClick={onCta}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}