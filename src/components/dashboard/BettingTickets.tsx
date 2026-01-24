import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import TicketCard, { type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { useTickets } from "@/hooks/useTickets";

type TabType = "daily" | "exclusive" | "premium";

/* =======================
   Map DB → UI model
======================= */
function mapDbTicketToTicket(dbTicket: any): BettingTicket {
  return {
    id: dbTicket.id,
    title: dbTicket.title,
    matchCount: dbTicket.matches?.length || 0,
    status: dbTicket.result ?? "pending",
    totalOdds: dbTicket.total_odds,
    tier: dbTicket.tier as ContentTier,
    matches: (dbTicket.matches || []).map((m: any) => ({
      name: m.match_name,
      prediction: m.prediction,
      odds: m.odds,
    })),
  };
}

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium" | undefined>();

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
  const { tickets: dbTickets, isLoading } = useTickets(false);

  const tickets = dbTickets.map(mapDbTicketToTicket);

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, sublabel: "Pro Members" },
    { id: "premium" as TabType, label: "Premium", icon: Crown, sublabel: "Premium Only" },
  ];

  const filteredTickets = tickets.filter((ticket) => ticket.tier === activeTab);

  return (
    <section className="space-y-1.5 sm:space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Ticket className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs sm:text-sm font-semibold text-foreground">Betting Tickets</h2>
      </div>

      {/* Tabs */}
      <Card className="p-0.5 bg-card border-border">
        <div className="grid grid-cols-3 gap-0.5">
          {tabs.map((tab) => {
            const count = tickets.filter((t) => t.tier === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-md transition-all",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-1">
                  <tab.icon className="h-3 w-3" />
                  <span className="font-medium text-[10px] sm:text-xs">{tab.label}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded-full",
                      activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {count}
                  </span>
                </div>
                <span className="text-[8px] sm:text-[9px] opacity-80">{tab.sublabel}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-md py-1 px-2 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-primary">
          <Users className="h-3 w-3" />
          <span>210 users unlocked daily tickets today</span>
        </div>
      </div>

      {/* Tickets */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-1.5 sm:gap-2">
          {filteredTickets.map((ticket) => {
            const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
            const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
            const isUnlocking = unlockingId === ticket.id;

            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isLocked={isLocked}
                unlockMethod={unlockMethod}
                onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
                onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
                isUnlocking={isUnlocking}
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">No {activeTab} tickets available</p>
        </Card>
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
