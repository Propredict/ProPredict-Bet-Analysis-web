import { Navigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";

/** Short share links: /premium-ticket, /premium-ticket/2, /free-ticket, /free-ticket/3 */
export function todaysTicketsOfTier(tickets: any[], tier: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  return tickets
    .filter(
      (t) =>
        t.tier === tier &&
        t.ticket_date === today &&
        String(t.category) !== "correct_score" &&
        !/^correct score/i.test(String(t.title ?? "")),
    )
    .sort((a, b) => String(a.created_at_ts ?? "").localeCompare(String(b.created_at_ts ?? "")));
}

export default function ShortTicketLink({ tier }: { tier: "premium" | "daily" }) {
  const { search } = useLocation();
  const { n } = useParams<{ n?: string }>();
  const { tickets, isLoading } = useTickets(false);
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const list = todaysTicketsOfTier(tickets, tier);
  const idx = Math.max(0, (parseInt(n ?? "1", 10) || 1) - 1);
  const t = list[idx] ?? list[0];
  if (!t) return <Navigate to={tier === "premium" ? "/premium-tickets" : "/tickets"} replace />;
  return <Navigate to={`/tickets/${t.id}${search}`} replace />;
}
