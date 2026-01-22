import { Ticket, RefreshCw, Loader2 } from "lucide-react";
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
  const { getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  // Filter tickets to only show daily tier
  const dailyTickets = tickets.filter((ticket) => ticket.tier === "daily");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Ticket className="h-3 w-3 mr-1" />
            Daily Tickets
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">Today's Betting Tickets</h1>
          <p className="text-muted-foreground">
            Curated multi-bet combinations • Pull down to refresh
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
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
