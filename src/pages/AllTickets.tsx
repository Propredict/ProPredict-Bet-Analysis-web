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
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
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
  
  const { tickets, isLoading, refetch } = useTickets(false);
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

  // Count tickets by tier
  const dailyCount = tickets.filter((t) => t.tier === "daily").length;
  const exclusiveCount = tickets.filter((t) => t.tier === "exclusive").length;
  const premiumCount = tickets.filter((t) => t.tier === "premium").length;
  const totalCount = tickets.length;

  // Filter tickets by active tab
  const filteredTickets = tickets.filter((ticket) => ticket.tier === activeTab);

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyCount },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, count: exclusiveCount },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumCount },
  ];

  const handleRefresh = () => {
    refetch();
    toast.success("Tickets refreshed");
  };

  return (
    <DashboardLayout>
      <div className="section-gap">
        {/* Page Header - Compact */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground">All Tickets</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Browse betting tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5">
              {totalCount}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-1 h-7 sm:h-8 px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <AllTicketsStatCard
            icon={Calendar}
            count={dailyCount}
            label="Daily"
            accentColor="primary"
          />
          <AllTicketsStatCard
            icon={Star}
            count={exclusiveCount}
            label="Pro"
            accentColor="accent"
          />
          <AllTicketsStatCard
            icon={Crown}
            count={premiumCount}
            label="Premium"
            accentColor="warning"
          />
        </div>

        {/* Category Tabs - Compact */}
        <Card className="p-0.5 sm:p-1 bg-card border-border">
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-md transition-all text-xs sm:text-sm",
                  activeTab === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="font-medium">{tab.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1 py-0",
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
                  onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier as ContentTier)}
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
