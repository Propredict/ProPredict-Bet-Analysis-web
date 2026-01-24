import { Ticket, RefreshCw, Target, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import TicketCard from "@/components/dashboard/TicketCard";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate } from "react-router-dom";

export default function DailyTickets() {
  const navigate = useNavigate();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  // Filter tickets to only show daily tier
  const dailyTickets = tickets.filter((ticket) => ticket.tier === "daily");

  const unlockedCount = dailyTickets.filter((ticket) =>
    canAccess("daily", "ticket", ticket.id)
  ).length;

  return (
    <DashboardLayout>
      <div className="section-gap">
        {/* Header - COMPACT */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground">Daily Tickets</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Curated multi-bet combinations updated daily</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[9px] sm:text-[10px] px-1.5 py-0.5">
              <Ticket className="h-2.5 w-2.5 mr-0.5" />
              Daily
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-0.5 h-6 sm:h-7 px-1.5">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Stats Cards - COMPACT */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Card className="p-1.5 sm:p-2 bg-card border-border">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-primary/20">
                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-foreground">75%</p>
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
                <p className="text-sm sm:text-base font-bold text-foreground">{dailyTickets.length}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Total Tickets</p>
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

        {/* Tickets List */}
        <div className="space-y-2 sm:space-y-3">
          {isLoading ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading tickets...</p>
              </div>
            </Card>
          ) : dailyTickets.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Ticket className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-primary mb-1">No daily tickets available</p>
                <p className="text-sm">Check back later for new picks</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            dailyTickets.map((ticket) => {
              const unlockMethod = getUnlockMethod("daily", "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const isUnlocking = unlockingId === ticket.id;
              
              // Show all matches when unlocked, only 3 when locked
              const matchesToShow = isLocked 
                ? (ticket.matches ?? []).slice(0, 3) 
                : (ticket.matches ?? []);

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
                    matches: matchesToShow.map((m) => ({
                      name: m.match_name,
                      prediction: m.prediction,
                      odds: m.odds,
                    })),
                    createdAt: ticket.created_at_ts,
                  }}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  onUnlockClick={() => handleUnlock("ticket", ticket.id, "daily")}
                  onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
                  isUnlocking={isUnlocking}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
