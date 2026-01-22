import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTickets } from "@/hooks/useTickets";

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, isLoading } = useTickets(false);

  const ticket = tickets.find(t => t.id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container max-w-2xl py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="p-6 mt-4">
          <p>Ticket not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Card className="p-6 mt-4">
        <h1 className="text-xl font-bold">{ticket.title}</h1>
        <p className="text-muted-foreground">{ticket.matches.length} matches</p>
      </Card>
    </div>
  );
}
