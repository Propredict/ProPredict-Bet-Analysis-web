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
        {/* Page Header - COMPACT */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground">All Tickets</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Browse betting tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5">
              {totalCount}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-0.5 h-6 sm:h-7 px-1.5"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Stats Cards - COMPACT */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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

        {/* Category Tabs - COMPACT */}
        <Card className="p-0.5 bg-card border-border">
          <div className="grid grid-cols-3 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded text-[10px] sm:text-xs transition-all",
                  activeTab === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-3 w-3" />
                <span className="font-medium">{tab.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[9px] px-1 py-0",
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
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
          <Card className="p-6 bg-card border-border text-center">
            <div className="flex flex-col items-center gap-3">
              <Ticket className="h-10 w-10 text-primary opacity-50" />
              <div>
                <p className="text-muted-foreground text-sm">No {activeTab} tickets available</p>
                <p className="text-xs text-muted-foreground">Check back soon!</p>
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
