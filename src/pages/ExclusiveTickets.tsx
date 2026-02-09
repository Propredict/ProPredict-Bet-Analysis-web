import { Helmet } from "react-helmet-async";
import { Ticket, Star, RefreshCw, Target, BarChart3, TrendingUp, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketCard from "@/components/dashboard/TicketCard";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ExclusiveTickets() {
  const navigate = useNavigate();
  const {
    tickets,
    isLoading,
    refetch
  } = useTickets(false);
  const {
    canAccess,
    getUnlockMethod,
    plan,
    isAdmin,
    refetch: refetchPlan
  } = useUserPlan();
  const {
    unlockingId,
    handleUnlock,
    handleSecondaryUnlock
  } = useUnlockHandler();
  const { isAndroidApp } = usePlatform();
  
  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const exclusiveTickets = tickets.filter(ticket => ticket.tier === "exclusive" && ticket.ticket_date === todayBelgrade);
  const unlockedCount = exclusiveTickets.filter(ticket => canAccess("exclusive", "ticket", ticket.id)).length;
  const showUpgradeBanner = !isAdmin && plan !== "premium";

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Tickets refreshed");
  };

  return <>
    <Helmet>
      <title>Pro AI Combos – ProPredict</title>
      <meta
        name="description"
        content="Pro-level AI-powered match combinations with advanced analysis. For informational and entertainment purposes only."
      />
    </Helmet>
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold sm:text-lg text-amber-400">Pro AI Combos</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              {isAndroidApp ? "Unlock combos by watching ads or go Premium for exclusive access" : "Advanced match combinations with higher confidence selections"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] sm:text-[10px] px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 mr-0.5" />
            Pro
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-0.5 h-6 sm:h-7 px-1.5">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Pro AI Combos include advanced match combinations with higher confidence selections, designed using AI analysis and extended statistical evaluation.
        </p>
      </Card>

      {/* Upgrade Banner */}
      {showUpgradeBanner && <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/20">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[10px] sm:text-xs text-amber-400">Remove Ads & Access Pro AI Predictions</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subscribe for $3.99/month</p>
              </div>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-6 sm:h-7 px-2 text-[9px] sm:text-[10px]" onClick={() => navigate("/get-premium")}>
              Subscribe Now
            </Button>
          </div>
        </div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">80%</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </Card>
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-accent/20">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">{exclusiveTickets.length}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Total Predictions</p>
            </div>
          </div>
        </Card>
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">{unlockedCount}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Access</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading tickets...</p>
            </div>
          </Card>
        ) : exclusiveTickets.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Ticket className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-primary mb-1">No pro AI combos available</p>
              <p className="text-sm">Check back later for new picks</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          exclusiveTickets.map((ticket) => {
            const unlockMethod = getUnlockMethod("exclusive", "ticket", ticket.id);
            const isLocked = unlockMethod?.type !== "unlocked";
            const isUnlocking = unlockingId === ticket.id;
            const matchesToShow = isLocked ? (ticket.matches ?? []).slice(0, 3) : ticket.matches ?? [];
            return (
              <TicketCard 
                key={ticket.id}
                ticket={{
                  id: ticket.id,
                  title: ticket.title,
                  matchCount: ticket.matches?.length ?? 0,
                  status: ticket.result ?? "pending",
                  totalOdds: ticket.total_odds ?? 0,
                  tier: ticket.tier,
                  matches: matchesToShow.map(m => ({
                    name: m.match_name,
                    prediction: m.prediction,
                    odds: m.odds
                  })),
                  createdAt: ticket.created_at_ts
                }} 
                isLocked={isLocked} 
                unlockMethod={unlockMethod} 
                onUnlockClick={() => handleUnlock("ticket", ticket.id, "exclusive")}
                onSecondaryUnlock={handleSecondaryUnlock}
                onViewTicket={() => navigate(`/tickets/${ticket.id}`)} 
                isUnlocking={isUnlocking} 
              />
            );
          })
        )}
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No betting or gambling services are provided.
      </p>
    </div>
  </>;
}
