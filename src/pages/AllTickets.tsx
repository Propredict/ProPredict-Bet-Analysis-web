import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Star, Crown, RefreshCw, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTickets, type TicketWithMatches } from "@/hooks/useTickets";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { PricingModal } from "@/components/PricingModal";
import { toast } from "sonner";
import { AllTicketsCard } from "@/components/all-tickets/AllTicketsCard";
import { AllTicketsStatCard } from "@/components/all-tickets/AllTicketsStatCard";

type TabType = "daily" | "exclusive" | "premium";

export default function AllTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium" | undefined>();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod, unlockContent } = useUserPlan();

  // Count tickets by tier
  const dailyCount = tickets.filter((t) => t.tier === "daily").length;
  const exclusiveCount = tickets.filter((t) => t.tier === "exclusive").length;
  const premiumCount = tickets.filter((t) => t.tier === "premium").length;
  const totalCount = tickets.length;

  // Filter tickets by active tab
  const filteredTickets = tickets.filter((ticket) => ticket.tier === activeTab);

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyCount },
    { id: "exclusive" as TabType, label: "Exclusive", icon: Star, count: exclusiveCount },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumCount },
  ];

  const handleUnlockClick = async (ticket: TicketWithMatches) => {
    const method = getUnlockMethod(ticket.tier as ContentTier, "ticket", ticket.id);
    if (!method || method.type === "unlocked") return;

    if (method.type === "login_required") {
      toast.info("Please sign in to unlock this content");
      navigate("/login");
      return;
    }

    if (method.type === "watch_ad") {
      setUnlockingId(ticket.id);
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

  const handleProClick = () => {
    setHighlightPlan("premium");
    setShowPricingModal(true);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Tickets refreshed");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ticket className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">All Tickets</h1>
              <p className="text-sm text-muted-foreground">Browse all betting tickets in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {totalCount} Total
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <AllTicketsStatCard
            icon={Calendar}
            count={dailyCount}
            label="Daily"
            accentColor="primary"
          />
          <AllTicketsStatCard
            icon={Star}
            count={exclusiveCount}
            label="Exclusive"
            accentColor="accent"
          />
          <AllTicketsStatCard
            icon={Crown}
            count={premiumCount}
            label="Premium"
            accentColor="warning"
          />
        </div>

        {/* Category Tabs */}
        <Card className="p-1 bg-card border-border">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs px-1.5 py-0.5",
                    activeTab === tab.id ? "bg-primary/20 text-primary" : ""
                  )}
                >
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Ticket List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const isLocked = !canAccess(ticket.tier as ContentTier, "ticket", ticket.id);
              const unlockMethod = getUnlockMethod(ticket.tier as ContentTier, "ticket", ticket.id);
              const isUnlocking = unlockingId === ticket.id;
              
              return (
                <AllTicketsCard
                  key={ticket.id}
                  ticket={ticket}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  onUnlockClick={() => handleUnlockClick(ticket)}
                  onProClick={handleProClick}
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
      </div>
    </DashboardLayout>
  );
}
