import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Crown,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { ContentTier, TicketResult } from "@/types/admin";
import { parseMatchName } from "@/types/admin";

interface AdminTicketCardProps {
  ticket: TicketWithMatches;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
}



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
      return <Badge variant="outline">{tier?.toUpperCase()}</Badge>;
  }
}

function getStatusBadge(status: string) {
  if (status === "published") {
    return <Badge className="bg-success/20 text-success border-success/30">Published</Badge>;
  }
  return <Badge variant="secondary" className="bg-muted text-muted-foreground">Draft</Badge>;
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

export function AdminTicketCard({
  ticket,
  onEdit,
  onPreview,
  onDelete,
  onMarkWon,
  onMarkLost,
}: AdminTicketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const matches = ticket.matches || [];
  const displayedMatches = isExpanded ? matches : matches.slice(0, 3);
  const hasMoreMatches = matches.length > 3;
  const result = (ticket as any).result ?? "pending";
  const isPublished = ticket.status === "published";

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Header Section */}
      <div className="p-4 space-y-3">
        {/* Row 1: Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {getResultBadge(result)}
          {getTierBadge(ticket.tier)}
          {getStatusBadge(ticket.status)}
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 ml-auto">
            @{ticket.total_odds?.toFixed(2) || "1.00"}
          </Badge>
        </div>

        {/* Row 2: Title */}
        <h3 className="font-bold text-lg text-foreground">{ticket.title}</h3>

        {/* Row 3: Match count */}
        <p className="text-sm text-muted-foreground">
          {matches.length} {matches.length === 1 ? "match" : "matches"}
        </p>
      </div>

      {/* Body Section - Collapsible Matches */}
      {matches.length > 0 && (
        <div className="px-4 pb-2">
          <div className="space-y-1">
            {displayedMatches.map((match, idx) => {
              const parsed = parseMatchName(match.match_name);
              return (
                <div
                  key={match.id || idx}
                  className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg border border-border/50"
                >
                  <div className="flex-1 mr-3 min-w-0">
                    <span className="text-sm text-foreground truncate block">
                      {parsed.homeTeam} vs {parsed.awayTeam}
                    </span>
                    {parsed.league && (
                      <span className="text-xs text-muted-foreground">{parsed.league}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      {match.prediction}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      @{match.odds.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand/Collapse Toggle */}
          {hasMoreMatches && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  +{matches.length - 3} more matches
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Footer Section - Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Result Actions - Only for published tickets */}
        {isPublished && result === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 border-success/30 text-success hover:bg-success/10"
              onClick={onMarkWon}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Won
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onMarkLost}
            >
              <XCircle className="h-4 w-4" />
              Mark Lost
            </Button>
          </div>
        )}

        {/* Admin Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onPreview}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
