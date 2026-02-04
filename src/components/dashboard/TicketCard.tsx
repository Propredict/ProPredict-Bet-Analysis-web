import {
  Ticket,
  Clock,
  Lock,
  Unlock,
  Star,
  Crown,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  Sparkles,
  Gift,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { parseMatchName } from "@/types/admin";

/* =======================
   Types
======================= */

export interface TicketMatch {
  name: string;
  prediction: string;
  odds: number;
}

export interface BettingTicket {
  id: string;
  title: string;
  matchCount: number;
  status: "pending" | "won" | "lost";
  totalOdds: number;
  tier: ContentTier;
  matches: TicketMatch[];
  createdAt?: string;
}

interface TicketCardProps {
  ticket: BettingTicket;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onSecondaryUnlock?: () => void;
  onViewTicket?: () => void;
  isUnlocking?: boolean;
}

/* =======================
   Helpers
======================= */

function getTierCardClass(tier: ContentTier, isLocked: boolean): string {
  const base = "tier-card";
  const unlocked = !isLocked ? "tier-card--unlocked" : "";
  
  switch (tier) {
    case "daily":
      return cn(base, "tier-card--daily", unlocked);
    case "exclusive":
      return cn(base, "tier-card--pro", unlocked);
    case "premium":
      return cn(base, "tier-card--premium", unlocked);
    default:
      return cn(base, "tier-card--free", unlocked);
  }
}

function getTierBadge(tier: ContentTier) {
  switch (tier) {
    case "free":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--free text-[10px] px-2 py-0.5">
          <Gift className="h-3 w-3" />
          Free
        </Badge>
      );
    case "daily":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--daily text-[10px] px-2 py-0.5">
          <Sparkles className="h-3 w-3" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--pro text-[10px] px-2 py-0.5">
          <Star className="h-3 w-3" />
          Pro
        </Badge>
      );
    case "premium":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--premium text-[10px] px-2 py-0.5">
          <Crown className="h-3 w-3" />
          Premium
        </Badge>
      );
    default:
      return null;
  }
}

function getUnlockButtonText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "unlocked") return "";
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "Unlock with Pro";
  if (unlockMethod.type === "upgrade_premium") return "Unlock with Premium";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

/* =======================
   Component
======================= */

function TicketCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
  onSecondaryUnlock,
  onViewTicket,
  isUnlocking = false,
}: TicketCardProps) {
  const navigate = useNavigate();
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";
  const isUnlocked = unlockMethod?.type === "unlocked";
  const isAndroidPremium = unlockMethod?.type === "android_premium_only";
  const ticketDate = ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime())
    ? format(new Date(ticket.createdAt), "EEE, MMM d")
    : "";

  const handleUnlockClick = () => {
    // Android: Navigate to paywall for premium content (no direct purchase)
    if (unlockMethod?.type === "android_premium_only") {
      navigate("/get-premium");
      return;
    }
    
    // Android-specific unlock types - call onUnlockClick (triggers native bridge for ads)
    if (
      unlockMethod?.type === "watch_ad" ||
      unlockMethod?.type === "android_watch_ad_or_pro"
    ) {
      onUnlockClick();
      return;
    }
    
    // Web-only redirects
    if (isPremiumLocked || isBasicLocked) {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
    } else {
      onUnlockClick();
    }
  };

  const handleSecondaryClick = () => {
    // Android: Navigate to paywall (no direct purchase trigger)
    if (getIsAndroidApp()) {
      navigate("/get-premium");
      return;
    }
    
    // Web-only fallback
    if (onSecondaryUnlock) {
      onSecondaryUnlock();
    } else {
      navigate("/get-premium");
    }
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case "won":
        return (
          <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Won
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-2">
            <XCircle className="h-3 w-3 mr-1" />
            Lost
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10 text-[10px] px-2">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") {
      return "";
    }
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") {
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "android_premium_only") {
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    }
    return "";
  };

  const getUnlockButtonIcon = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;
    if (unlockMethod.type === "login_required") return LogIn;
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") return Sparkles;
    if (unlockMethod.type === "android_premium_only") return Crown;
    if (unlockMethod.type === "upgrade_basic") return Star;
    return Crown;
  };

  const displayedMatches = ticket.matches.slice(0, 3);
  const remainingCount = ticket.matchCount > 3 ? ticket.matchCount - 3 : 0;

  const handleCardClick = () => {
    navigate(`/tickets/${ticket.id}`);
  };

  // Locked state
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <div 
        className={cn(getTierCardClass(ticket.tier, isLocked), "cursor-pointer group")}
        onClick={handleCardClick}
      >
        {/* Card Header */}
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getTierBadge(ticket.tier)}
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">
                {ticket.matchCount} Matches
              </span>
            </div>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Ticket Title */}
          <h3 className="font-bold text-sm sm:text-base text-foreground">{ticket.title}</h3>
          {ticketDate && <span className="text-[10px] text-muted-foreground">{ticketDate}</span>}
        </div>

        {/* Match List - Blurred */}
        <div className="px-3 sm:px-4 pb-3 space-y-2">
          {displayedMatches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm text-foreground truncate block font-medium">
                      {parsed.homeTeam} vs {parsed.awayTeam}
                    </span>
                    {parsed.league && (
                      <span className="text-[10px] text-muted-foreground">{parsed.league}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 blur-sm opacity-50">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-1.5">
                      {match.prediction || "???"}
                    </Badge>
                    <span className="text-xs font-medium text-primary">@{match.odds.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {remainingCount > 0 && (
            <p className="text-center text-[10px] text-primary pt-1 flex items-center justify-center gap-0.5 group-hover:underline">
              +{remainingCount} more matches
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          )}
        </div>

        {/* Combined Value - Blurred */}
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Combined Value</span>
            <span className="font-bold text-base text-primary blur-sm opacity-50">@{ticket.totalOdds.toFixed(2)}</span>
          </div>
        </div>

        {/* Unlock Button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-3 sm:p-4 pt-0">
            {/* Android dual-button layout for Pro/Exclusive content */}
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  className="w-full gap-1.5 h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-white border-0"
                  disabled={isUnlocking}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockClick();
                  }}
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Watching ad...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {unlockMethod.primaryMessage}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "w-full h-7 text-[10px] font-medium",
                    getIsAndroidApp()
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  variant={getIsAndroidApp() ? "default" : "ghost"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSecondaryClick();
                  }}
                >
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : (
              <Button
                variant={unlockMethod.type === "login_required" ? "outline" : "default"}
                size="sm"
                className={cn("w-full gap-1.5 h-9 text-xs font-medium", getUnlockButtonStyle())}
                disabled={isUnlocking}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlockClick();
                }}
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Watching ad...
                  </>
                ) : (
                  <>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {getUnlockButtonText(unlockMethod)}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Unlocked state
  return (
    <div 
      className={cn(getTierCardClass(ticket.tier, isLocked), "cursor-pointer group")}
      onClick={handleCardClick}
    >
      {/* Card Header */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">
              {ticket.matchCount} Matches
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {getStatusBadge()}
          </div>
        </div>

        {/* Ticket Title */}
        <h3 className="font-bold text-sm sm:text-base text-foreground">{ticket.title}</h3>
        {ticketDate && <span className="text-[10px] text-muted-foreground">{ticketDate}</span>}
      </div>

      {/* Match List - Revealed */}
      <div className="px-3 sm:px-4 pb-3 space-y-1.5">
        {displayedMatches.length > 0 ? (
          displayedMatches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-foreground truncate block font-medium">
                    {parsed.homeTeam} vs {parsed.awayTeam}
                  </span>
                  {parsed.league && (
                    <span className="text-[10px] text-muted-foreground">{parsed.league}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">
                    {match.prediction}
                  </Badge>
                  <span className="text-xs font-bold text-primary">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground py-2">No matches</p>
        )}
        
        {remainingCount > 0 && (
          <p className="text-center text-[10px] text-primary pt-1 flex items-center justify-center gap-0.5 group-hover:underline">
            +{remainingCount} more matches
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        )}
      </div>

      {/* Combined Value Footer */}
      <div className="mx-3 sm:mx-4 mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Combined Value</span>
          <span className="font-bold text-base text-primary">@{ticket.totalOdds.toFixed(2)}</span>
        </div>
      </div>

      {/* Unlocked Footer */}
      <div className="p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-success/10 rounded-lg border border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-success">Ticket Unlocked</span>
        </div>
      </div>
    </div>
  );
}

/* =======================
   Exports
======================= */

export default TicketCard;
