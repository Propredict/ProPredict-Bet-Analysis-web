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
    const baseStyles = "relative py-3 px-3 rounded-xl text-xs font-semibold transition-all duration-300 border-2 shadow-md";
    
    if (isActive) {
      switch (tabId) {
        case "daily":
          return cn(baseStyles, "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-yellow-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/20");
        case "exclusive":
          return cn(baseStyles, "bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-indigo-500/20 border-violet-500/50 text-violet-400 shadow-violet-500/20");
        case "premium":
          return cn(baseStyles, "bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-orange-500/20 border-yellow-500/50 text-yellow-400 shadow-yellow-500/25 glow-warning");
        default:
          return cn(baseStyles, "bg-primary/20 border-primary/50 text-primary");
      }
    }
    
    // Inactive tabs with visible background
    return cn(baseStyles, "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/80");
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Tickets refreshed");
  };

  return (
    <div className="space-y-5">
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

      {/* Category Tabs - Card-like styling matching Dashboard */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <tab.icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive && "scale-110 drop-shadow-lg"
                )} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-background/20" : "bg-muted/50"
                  )}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ticket Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
