import { useState } from "react";
import { Ticket, RefreshCw, Eye, Play, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function DailyTickets() {
  const navigate = useNavigate();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod, unlockContent } = useUserPlan();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Filter tickets to only show daily tier
  const dailyTickets = tickets.filter((ticket) => ticket.tier === "daily");

  const handleUnlock = async (ticketId: string) => {
    setUnlockingId(ticketId);
    await unlockContent("ticket", ticketId);
    setUnlockingId(null);
  };

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
              const matchesToShow = ticket.matches?.slice(0, 3) ?? [];

              return (
                <Card key={ticket.id} className="bg-card border-border overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">{ticket.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Check</p>
                  </div>

                  {/* Matches */}
                  <div className="p-4 space-y-3">
                    {matchesToShow.map((match, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0",
                          isLocked && "blur-sm select-none"
                        )}
                      >
                        <span className="text-muted-foreground">{match.match_name}</span>
                        <span className="text-muted-foreground">@</span>
                      </div>
                    ))}
                    {(ticket.matches?.length ?? 0) > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{(ticket.matches?.length ?? 0) - 3} more matches
                      </p>
                    )}
                  </div>

                  {/* Footer with unlock */}
                  {isLocked && unlockMethod && (
                    <div className="p-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>Watch ad to unlock predictions</span>
                      </div>
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        disabled={isUnlocking}
                        onClick={() => {
                          if (unlockMethod.type === "login_required") {
                            navigate("/login");
                          } else if (unlockMethod.type === "watch_ad") {
                            handleUnlock(ticket.id);
                          }
                        }}
                      >
                        {isUnlocking ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Watching...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Watch Ad
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* View Full Ticket when unlocked */}
                  {!isLocked && (
                    <div className="p-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        View Full Ticket
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
