import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Star, Crown, RefreshCw, Loader2, TrendingUp } from "lucide-react";
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
    }
  });

  const dailyCount = tickets.filter(t => t.tier === "daily").length;
  const exclusiveCount = tickets.filter(t => t.tier === "exclusive").length;
  const premiumCount = tickets.filter(t => t.tier === "premium").length;
  const totalCount = tickets.length;

  const filteredTickets = tickets.filter(ticket => ticket.tier === activeTab);

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyCount, color: "accent" },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, count: exclusiveCount, color: "primary" },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumCount, color: "warning" }
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

  const handleRefresh = () => {
    refetch();
    toast.success("Tickets refreshed");
  };

  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">All Tickets</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Browse all betting tickets</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-muted/30">
            {totalCount} total
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh} 
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <AllTicketsStatCard icon={Calendar} count={dailyCount} label="Daily" accentColor="accent" />
        <AllTicketsStatCard icon={Star} count={exclusiveCount} label="Pro" accentColor="primary" />
        <AllTicketsStatCard icon={Crown} count={premiumCount} label="Premium" accentColor="warning" />
      </div>

      {/* Category Tabs - Enhanced */}
      <Card className="p-1 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200",
                  getTabStyles(tab.id, isActive)
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[8px] px-1.5 py-0 h-4 min-w-[18px]",
                    isActive ? "bg-background/30 font-semibold" : "bg-muted/50"
                  )}
                >
                  {tab.count}
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Ticket List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="space-y-2.5">
          {filteredTickets.map(ticket => {
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
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-2">
            {activeTab === "daily" && <Calendar className="h-6 w-6 text-accent/40" />}
            {activeTab === "exclusive" && <Star className="h-6 w-6 text-primary/40" />}
            {activeTab === "premium" && <Crown className="h-6 w-6 text-warning/40" />}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">No {activeTab} tickets available</p>
              <p className="text-[10px] text-muted-foreground/70">Check back soon!</p>
            </div>
          </div>
        </Card>
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </div>
  );
}
