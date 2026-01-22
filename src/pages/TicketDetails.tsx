import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTickets } from "@/hooks/useTickets";

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { tickets, isLoading } = useTickets(false);

  const ticket = tickets.find((t) => t.id === id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Ticket not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">{ticket.title}</h1>

        <div className="space-y-2">
          {ticket.matches.map((match, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-border pb-2">
              <span>{match.match_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{match.prediction}</span>
                <span className="font-semibold text-primary">@{match.odds.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t border-border">
          <span className="text-muted-foreground">Total Odds</span>
          <span className="text-xl font-bold text-primary">@{ticket.total_odds.toFixed(2)}</span>
        </div>
      </Card>
    </div>
  );
}
