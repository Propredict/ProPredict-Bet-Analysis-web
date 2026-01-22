import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import TicketCard, { type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { toast } from "sonner";
import { useTickets } from "@/hooks/useTickets";

type TabType = "daily" | "exclusive" | "premium";

// Map database tickets to the display format
function mapDbTicketToTicket(dbTicket: any): BettingTicket {
  return {
    id: dbTicket.id,
    title: dbTicket.title,
    matchCount: dbTicket.matches?.length || 0,
    status: "pending",
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
    { id: "daily" as TabType, label: "Daily", icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Exclusive", icon: Star, sublabel: "Basic+ Members" },
    { id: "premium" as TabType, label: "Premium", icon: Crown, sublabel: "Premium Only" },
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

      // Simulate ad playback delay
      toast.info("Playing rewarded ad...", { duration: 2000 });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const success = await unlockContent("ticket", ticket.id);

      if (success) {
        toast.success("Ticket unlocked! Valid until midnight UTC.");
      } else {
        toast.error("Failed to unlock. Please try again.");
      }

      setUnlockingId(null);
    } else if (method.type === "upgrade_basic") {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    } else if (method.type === "upgrade_premium") {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Betting Tickets</h2>
      </div>

      <Card className="p-1 bg-card border-border">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const ticketCount = tickets.filter((t) => t.tier === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {ticketCount}
                  </span>
                </div>
                <span className="text-xs opacity-80">{tab.sublabel}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Users unlocked banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Users className="h-4 w-4" />
          <span>210 users unlocked daily tips today</span>
        </div>
      </div>

      {/* Tickets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
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
                onUnlockClick={() => handleUnlockClick(ticket)}
                isUnlocking={isUnlocking}
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-8 bg-card border-border text-center">
          <div className="flex flex-col items-center gap-4">
            <Ticket className="h-12 w-12 text-primary opacity-50" />
            <div>
              <p className="text-muted-foreground">No {activeTab} tickets available</p>
              <p className="text-sm text-muted-foreground">Check back soon for new tickets!</p>
            </div>
          </div>
        </Card>
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
