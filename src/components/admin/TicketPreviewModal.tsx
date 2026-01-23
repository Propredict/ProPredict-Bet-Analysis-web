import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Star, Crown, Sparkles } from "lucide-react";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { ContentTier } from "@/types/admin";

interface TicketPreviewModalProps {
  ticket: TicketWithMatches | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TicketResult = "pending" | "won" | "lost";

function getTierBadge(tier: ContentTier) {
  switch (tier) {
    case "daily":
      return (
        <Badge className="gap-1 bg-accent/20 text-accent border-accent/30">
          <Sparkles className="h-3 w-3" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
          <Star className="h-3 w-3" />
          Pro
        </Badge>
      );
    case "premium":
      return (
        <Badge className="gap-1 bg-warning/20 text-warning border-warning/30">
          <Crown className="h-3 w-3" />
          Premium
        </Badge>
      );
    default:
      return null;
  }
}

function getResultBadge(result: TicketResult) {
  switch (result) {
    case "won":
      return (
        <Badge className="gap-1 bg-success/20 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3" />
          Won
        </Badge>
      );
    case "lost":
      return (
        <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/30">
          <XCircle className="h-3 w-3" />
          Lost
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

export function TicketPreviewModal({ ticket, open, onOpenChange }: TicketPreviewModalProps) {
  if (!ticket) return null;

  const matches = ticket.matches || [];
  const result = (ticket as any).result ?? "pending";
  const totalOdds = ticket.total_odds || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>User Preview</span>
            <Badge variant="outline" className="text-xs">Exact View</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Preview Card - Matches exact user UI */}
        <div className="rounded-lg border border-primary/30 overflow-hidden bg-card">
          {/* Header */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTierBadge(ticket.tier)}
                <span className="text-xs text-muted-foreground">
                  {matches.length} Matches
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getResultBadge(result)}
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                  @{totalOdds.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="px-4 pb-3">
            <h3 className="font-bold text-lg text-foreground">{ticket.title}</h3>
          </div>

          {/* Matches */}
          <div className="px-4 pb-3 space-y-2">
            {matches.map((match, idx) => (
              <div
                key={match.id || idx}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <span className="text-sm text-foreground truncate flex-1 mr-4">
                  {match.match_name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="text-sm font-medium text-primary">
                    @{match.odds.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total Odds */}
          <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Odds</span>
              <span className="font-bold text-lg text-primary">@{totalOdds.toFixed(2)}</span>
            </div>
          </div>

          {/* Unlocked Badge */}
          <div className="px-4 py-3 border-t border-border/50">
            <Badge className="w-full justify-center gap-2 py-2 bg-success/20 text-success border-success/30">
              <CheckCircle2 className="h-4 w-4" />
              Ticket Unlocked
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
