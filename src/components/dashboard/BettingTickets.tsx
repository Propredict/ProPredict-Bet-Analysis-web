import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { TicketCard, type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { toast } from "sonner";

type TabType = "daily" | "exclusive" | "premium";

// Sample tickets data
const sampleTickets: BettingTicket[] = [
  {
    id: "1",
    title: "Daily Ticket Champions League #1",
    matchCount: 5,
    status: "pending",
    totalOdds: 3.41,
    tier: "daily",
    matches: [
      { name: "Liverpool vs Man City", prediction: "Over 1.5", odds: 1.20 },
      { name: "Real Madrid vs Barcelona", prediction: "BTTS", odds: 1.41 },
      { name: "Bayern vs Dortmund", prediction: "Home Win", odds: 1.40 },
    ],
  },
  {
    id: "2",
    title: "Daily Ticket Premier League",
    matchCount: 4,
    status: "pending",
    totalOdds: 4.25,
    tier: "daily",
    matches: [
      { name: "Arsenal vs Chelsea", prediction: "Over 2.5", odds: 1.65 },
      { name: "Man Utd vs Tottenham", prediction: "BTTS", odds: 1.55 },
      { name: "Newcastle vs Brighton", prediction: "Home Win", odds: 1.66 },
    ],
  },
  {
    id: "3",
    title: "Exclusive Weekend Accumulator",
    matchCount: 6,
    status: "pending",
    totalOdds: 8.75,
    tier: "exclusive",
    matches: [
      { name: "PSG vs Marseille", prediction: "Home -1.5", odds: 1.85 },
      { name: "Inter vs AC Milan", prediction: "Under 3.5", odds: 1.45 },
      { name: "Atletico vs Sevilla", prediction: "Home Win", odds: 1.70 },
    ],
  },
  {
    id: "4",
    title: "Exclusive High Odds Special",
    matchCount: 5,
    status: "won",
    totalOdds: 12.50,
    tier: "exclusive",
    matches: [
      { name: "Ajax vs PSV", prediction: "Over 3.5", odds: 2.10 },
      { name: "Celtic vs Rangers", prediction: "BTTS", odds: 1.50 },
      { name: "Benfica vs Porto", prediction: "Draw", odds: 3.40 },
    ],
  },
  {
    id: "5",
    title: "Premium VIP Ticket",
    matchCount: 7,
    status: "pending",
    totalOdds: 25.00,
    tier: "premium",
    matches: [
      { name: "Confidential Match 1", prediction: "Expert Pick", odds: 2.00 },
      { name: "Confidential Match 2", prediction: "Expert Pick", odds: 1.80 },
      { name: "Confidential Match 3", prediction: "Expert Pick", odds: 2.20 },
    ],
  },
  {
    id: "6",
    title: "Premium Safe Banker",
    matchCount: 4,
    status: "pending",
    totalOdds: 5.50,
    tier: "premium",
    matches: [
      { name: "Top Match 1", prediction: "Safe Pick", odds: 1.35 },
      { name: "Top Match 2", prediction: "Safe Pick", odds: 1.40 },
      { name: "Top Match 3", prediction: "Safe Pick", odds: 1.30 },
    ],
  },
];

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium" | undefined>();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const { canAccess, getUnlockMethod, unlockContent, isAuthenticated } = useUserPlan();

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Exclusive", icon: Star, sublabel: "Basic+ Members" },
    { id: "premium" as TabType, label: "Premium", icon: Crown, sublabel: "Premium Only" },
  ];

  const filteredTickets = sampleTickets.filter((ticket) => ticket.tier === activeTab);

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
            const ticketCount = sampleTickets.filter((t) => t.tier === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
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
      {filteredTickets.length > 0 ? (
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

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal}
        highlightPlan={highlightPlan}
      />
    </section>
  );
}