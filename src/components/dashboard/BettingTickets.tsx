import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
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
    matches: db.matches ?? [],
  };
}

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { tickets: dbTickets = [], isLoading } = useTickets(false);
  const { data: accuracyData = [] } = useTicketAccuracy();

  const tickets = dbTickets.map(mapDbTicket);

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
    { id: "daily", label: "Daily", icon: Sparkles, color: "accent" },
    { id: "exclusive", label: "Pro", icon: Star, color: "primary" },
    { id: "premium", label: "Premium", icon: Crown, color: "warning" },
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    if (!isActive) return "text-muted-foreground hover:text-foreground hover:bg-muted/50";
    
    switch (tabId) {
      case "daily":
        return "bg-accent/20 text-accent border border-accent/30";
      case "exclusive":
        return "bg-primary/20 text-primary border border-primary/30";
      case "premium":
        return "bg-warning/20 text-warning border border-warning/30";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const filtered = tickets.filter((t) => t.tier === activeTab);

  return (
    <section className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
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

      {/* Tab Navigation - Enhanced with tier colors */}
      <Card className="p-1 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tickets.filter((t) => t.tier === tab.id).length;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "relative py-2 sm:py-2.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200",
                  getTabStyles(tab.id, isActive)
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5 mx-auto", isActive && "drop-shadow-sm")} />
                <p className="mt-0.5">{tab.label}</p>
                {count > 0 && (
                  <span className={cn(
                    "text-[8px]",
                    isActive ? "font-semibold opacity-80" : "opacity-60"
                  )}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tickets Content */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((ticket) => {
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
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-accent/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-primary/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-warning/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab} tickets available
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
