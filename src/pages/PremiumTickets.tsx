import { Ticket, Crown, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import TicketCard from "@/components/dashboard/TicketCard";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";

export default function PremiumTickets() {
  const navigate = useNavigate();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod, plan } = useUserPlan();

  // Filter tickets to only show premium tier
  const premiumTickets = tickets.filter((ticket) => ticket.tier === "premium");

  const unlockedCount = premiumTickets.filter((ticket) =>
    canAccess("premium", "ticket", ticket.id)
  ).length;

  const showUpgradeBanner = plan !== "premium";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Crown className="h-7 w-7 text-warning" />
              <h1 className="text-2xl font-bold text-foreground">Premium Tickets</h1>
            </div>
            <p className="text-muted-foreground mt-1">Highest value picks for subscribers</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-warning/20 text-warning border-warning/30">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{premiumTickets.length}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unlockedCount}</p>
                <p className="text-xs text-muted-foreground">Access</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Unlock Banner */}
        {showUpgradeBanner && (
          <Card className="p-4 bg-gradient-to-r from-warning/20 to-accent/20 border-warning/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Lock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Unlock Premium Access</h3>
                  <p className="text-sm text-muted-foreground">Subscribe to view all premium tickets</p>
                </div>
              </div>
              <Button
                className="bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0 gap-2"
                onClick={() => navigate("/get-premium")}
              >
                <Sparkles className="h-4 w-4" />
                Subscribe
              </Button>
            </div>
          </Card>
        )}

        {/* Tickets List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading tickets...</p>
              </div>
            </Card>
          ) : premiumTickets.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Ticket className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-warning mb-1">No premium tickets available</p>
                <p className="text-sm">Check back later for new picks</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            premiumTickets.map((ticket) => {
              const unlockMethod = getUnlockMethod("premium", "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";

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
                    matches: (ticket.matches ?? []).slice(0, 3).map((m) => ({
                      name: m.match_name,
                      prediction: m.prediction,
                      odds: m.odds,
                    })),
                  }}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  onUnlockClick={() => navigate("/get-premium")}
                  onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
                  isUnlocking={false}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
