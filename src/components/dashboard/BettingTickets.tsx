import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  Sparkles,
  Star,
  Crown,
  Users,
  Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useTickets } from "@/hooks/useTickets";
import { useTicketAccuracy } from "@/hooks/useTicketAccuracy";

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
  const [highlightPlan, setHighlightPlan] =
    useState<"basic" | "premium">();

  const { tickets: dbTickets, isLoading } = useTickets(false);
  const { data: accuracyData = [] } = useTicketAccuracy();

  const tickets = dbTickets.map(mapDbTicket);

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

  const filtered = tickets.filter((t) => t.tier === activeTab);
  const accuracy =
    accuracyData.find((a) => a.tier === activeTab)?.accuracy ?? 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">
          Betting Tickets · {accuracy}%
        </h2>
      </div>

      <Card className="p-1">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const count = tickets.filter(
              (t) => t.tier === tab.id
            ).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "flex flex-col items-center py-2 rounded",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-xs">{tab.label}</span>
                <span className="text-[10px] opacity-70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {isLoading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {filtered.map((ticket) => {
            const isLocked = !canAccess(
              ticket.tier,
              "ticket",
              ticket.id
            );

            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isLocked={isLocked}
                unlockMethod={getUnlockMethod(
                  ticket.tier,
                  "ticket",
                  ticket.id
                )}
                isUnlocking={unlockingId === ticket.id}
                onUnlockClick={() =>
                  handleUnlock("ticket", ticket.id, ticket.tier)
                }
                onViewTicket={() =>
                  navigate(`/tickets/${ticket.id}`)
                }
              />
            );
          })}
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
