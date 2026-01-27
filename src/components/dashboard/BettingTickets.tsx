import { useState } from "react";
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
    { id: "daily", label: "Daily", icon: Sparkles },
    { id: "exclusive", label: "Pro", icon: Star },
    { id: "premium", label: "Premium", icon: Crown },
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3 px-3 rounded-xl text-xs font-semibold transition-all duration-300 border-2 shadow-md";
    
    // Each tier always shows its color - stronger when active, subtle when inactive
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-yellow-500/25 border-amber-500/60 text-amber-400 shadow-amber-500/25")
          : cn(baseStyles, "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 border-amber-500/30 text-amber-400/70 hover:border-amber-500/50 hover:text-amber-400");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-violet-500/25 via-purple-500/20 to-indigo-500/25 border-violet-500/60 text-violet-400 shadow-violet-500/25")
          : cn(baseStyles, "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border-violet-500/30 text-violet-400/70 hover:border-violet-500/50 hover:text-violet-400");
      case "premium":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-yellow-500/25 via-amber-500/20 to-orange-500/25 border-yellow-500/60 text-yellow-400 shadow-yellow-500/30 glow-warning animate-[pulse_3s_ease-in-out_infinite]")
          : cn(baseStyles, "bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10 border-yellow-500/30 text-yellow-400/70 hover:border-yellow-500/50 hover:text-yellow-400");
      default:
        return cn(baseStyles, "bg-card border-border text-muted-foreground");
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

      {/* Tab Navigation - Card-like styling */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tickets.filter((t) => t.tier === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <tab.icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive && "scale-110 drop-shadow-lg"
                )} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-background/20" : "bg-muted/50"
                  )}>
                    {count}
                  </span>
                )}
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
          {displayedTickets.map((ticket) => {
            const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
            const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isLocked={isLocked}
                unlockMethod={unlockMethod}
                isUnlocking={unlockingId === ticket.id}
                onUnlockClick={() =>
                  handleUnlock("ticket", ticket.id, ticket.tier)
                }
              />
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
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-violet-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-yellow-500/50" />}
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