import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { TicketCard, type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { toast } from "sonner";
import { useTickets } from "@/hooks/useTickets";

type TabType = "daily" | "exclusive" | "premium";

/* =====================
   MAP DB → UI
===================== */
function mapDbTicketToTicket(dbTicket: any): BettingTicket {
  return {
    id: dbTicket.id,
    title: dbTicket.title,
    matchCount: dbTicket.matches?.length || 0,
    status: dbTicket.result ?? "pending", // ✅ FIX
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
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const { canAccess, getUnlockMethod, unlockContent } = useUserPlan();
  const { tickets: dbTickets, isLoading } = useTickets(false);

  const tickets = dbTickets.map(mapDbTicketToTicket);

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Sparkles },
    { id: "exclusive" as TabType, label: "Exclusive", icon: Star },
    { id: "premium" as TabType, label: "Premium", icon: Crown },
  ];

  const filteredTickets = tickets.filter((ticket) => ticket.tier === activeTab);

  const handleUnlockClick = async (ticket: BettingTicket) => {
    const method = getUnlockMethod(ticket.tier, "ticket", ticket.id);
    if (!method || method.type === "unlocked") return;

    if (method.type === "login_required") {
      toast.info("Please sign in to unlock this content");
      navigate("/login");
      return;
    }

    if (method.type === "watch_ad") {
      setUnlockingId(ticket.id);
      await new Promise((r) => setTimeout(r, 2000));
      await unlockContent("ticket", ticket.id);
      setUnlockingId(null);
      return;
    }

    if (method.type === "upgrade_basic") {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    }

    if (method.type === "upgrade_premium") {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Betting Tickets</h2>
      </div>

      <Card className="p-1">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3 rounded-lg",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <tab.icon className="mx-auto h-4 w-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Loader2 className="mx-auto animate-spin" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
            const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);

            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isLocked={isLocked}
                unlockMethod={unlockMethod}
                isUnlocking={unlockingId === ticket.id}
                onUnlockClick={
                  () => (isLocked ? handleUnlockClick(ticket) : navigate(`/tickets/${ticket.id}`)) // ✅ VIEW PAGE
                }
              />
            );
          })}
        </div>
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
