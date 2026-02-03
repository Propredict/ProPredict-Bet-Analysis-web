import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useTickets } from "@/hooks/useTickets";
import { useTicketAccuracy } from "@/hooks/useTicketAccuracy";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";

import TicketCard, { type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { InlineListAd } from "@/components/ads/EzoicAd";

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
  daily: "/daily-tickets",
  exclusive: "/exclusive-tickets",
  premium: "/premium-tickets"
};

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { tickets: dbTickets = [], isLoading } = useTickets(false);
  const { data: accuracyData = [] } = useTicketAccuracy();

  const tickets = dbTickets.map(mapDbTicket);
  const filtered = tickets.filter((t) => t.tier === activeTab);
  const displayedTickets = filtered.slice(0, 4);
  const hasMoreTickets = filtered.length > 4;

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
    { id: "exclusive", label: "Exclusive", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown },
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-2.5 px-4 rounded-lg text-xs font-semibold transition-all duration-300 border-l-2 bg-card/50";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-l-primary bg-primary/10")
          : cn(baseStyles, "border-l-transparent hover:bg-primary/5");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-l-amber-500 bg-amber-500/10")
          : cn(baseStyles, "border-l-transparent hover:bg-amber-500/5");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-l-fuchsia-500 bg-fuchsia-500/10")
          : cn(baseStyles, "border-l-transparent hover:bg-fuchsia-500/5");
      default:
        return cn(baseStyles, "border-l-transparent");
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
      case "daily": return "text-muted-foreground";
      case "exclusive": return "text-amber-400/70";
      case "premium": return "text-fuchsia-400/70";
      default: return "text-muted-foreground";
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily tickets";
      case "exclusive": return "See all Pro tickets";
      case "premium": return "See all Premium tickets";
    }
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daily Tickets</h2>
            <p className="text-[9px] text-muted-foreground">Multi-bet combinations</p>
          </div>
        </div>
        {accuracy > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] text-muted-foreground">Win Rate</span>
            <span className="text-xs font-bold text-primary">{accuracy}%</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-secondary/30">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tickets.filter((t) => t.tier === tab.id).length;
          const textColor = getTextColor(tab.id);
          const subtitleColor = getSubtitleColor(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <tab.icon className={cn("h-3.5 w-3.5", textColor)} />
                  <span className={cn("font-semibold", textColor)}>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50",
                    textColor
                  )}>
                    {count}
                  </span>
                </div>
                <span className={cn("text-[9px]", subtitleColor)}>{tab.subtitle}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayedTickets.map((ticket, index) => {
            const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
            const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
            // Show ads after every 3rd card for Daily & Pro tabs only (not Premium)
            const showAdAfter = activeTab !== "premium" && (index + 1) % 3 === 0 && index < displayedTickets.length - 1;
            return (
              <Fragment key={ticket.id}>
                <TicketCard
                  ticket={ticket}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  isUnlocking={unlockingId === ticket.id}
                  onUnlockClick={() =>
                    handleUnlock("ticket", ticket.id, ticket.tier)
                  }
                />
                {showAdAfter && <InlineListAd />}
              </Fragment>
            );
          })}
          
          {/* See All CTA */}
          {(hasMoreTickets || filtered.length > 0) && (
            <Button
              variant="outline"
              className="w-full mt-3 border-border/50 hover:border-primary/50 hover:bg-primary/5 group"
              onClick={() => navigate(TAB_ROUTES[activeTab])}
            >
              <span>{getCtaLabel()}</span>
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-fuchsia-500/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} tickets available
            </p>
          </div>
        </Card>
      )}

      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        highlightPlan={highlightPlan}
      />
    </section>
  );
}