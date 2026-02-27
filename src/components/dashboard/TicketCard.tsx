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
  TrendingUp,
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

const TIER_ACCENT = {
  free: { gradient: "from-teal-500/20 to-teal-600/5", line: "bg-primary", glow: "shadow-[0_0_20px_rgba(15,155,142,0.15)]" },
  daily: { gradient: "from-teal-500/20 to-teal-600/5", line: "bg-primary", glow: "shadow-[0_0_20px_rgba(15,155,142,0.15)]" },
  exclusive: { gradient: "from-amber-500/20 to-amber-600/5", line: "bg-amber-500", glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]" },
  premium: { gradient: "from-fuchsia-500/20 to-fuchsia-600/5", line: "bg-fuchsia-500", glow: "shadow-[0_0_20px_rgba(217,70,239,0.15)]" },
} as const;

function getTierBadge(tier: ContentTier) {
  switch (tier) {
    case "free":
      return <Badge variant="secondary" className="gap-1 tier-badge--free text-[10px] px-2 py-0.5"><Gift className="h-3 w-3" />Free</Badge>;
    case "daily":
      return <Badge variant="secondary" className="gap-1 tier-badge--daily text-[10px] px-2 py-0.5"><Sparkles className="h-3 w-3" />Daily</Badge>;
    case "exclusive":
      return <Badge variant="secondary" className="gap-1 tier-badge--pro text-[10px] px-2 py-0.5"><Star className="h-3 w-3" />Pro</Badge>;
    case "premium":
      return <Badge variant="secondary" className="gap-1 tier-badge--premium text-[10px] px-2 py-0.5"><Crown className="h-3 w-3" />Premium</Badge>;
    default:
      return null;
  }
}

function getUnlockButtonText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "unlocked") return "";
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "Pro Access Required";
  if (unlockMethod.type === "upgrade_premium") return "Premium Access Required";
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
  const accent = TIER_ACCENT[ticket.tier] || TIER_ACCENT.daily;

  const ticketDate = ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime())
    ? format(new Date(ticket.createdAt), "EEE, MMM d")
    : "";

  const handleUnlockClick = () => {
    if (unlockMethod?.type === "android_premium_only") { navigate("/get-premium"); return; }
    if (unlockMethod?.type === "watch_ad" || unlockMethod?.type === "android_watch_ad_or_pro") { onUnlockClick(); return; }
    if (isPremiumLocked || isBasicLocked) { navigate("/get-premium"); }
    else if (unlockMethod?.type === "login_required") { navigate("/login"); }
    else { onUnlockClick(); }
  };

  const handleSecondaryClick = () => {
    if (getIsAndroidApp()) { navigate("/get-premium"); return; }
    if (onSecondaryUnlock) { onSecondaryUnlock(); } else { navigate("/get-premium"); }
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case "won":
        return <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-2"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
      case "lost":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-2"><XCircle className="h-3 w-3 mr-1" />Missed</Badge>;
      default:
        return <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10 text-[10px] px-2"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") return "";
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") return "bg-primary hover:bg-primary/90 text-white border-0";
    if (unlockMethod.type === "android_premium_only") return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    if (unlockMethod.type === "upgrade_basic") return "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0";
    if (unlockMethod.type === "upgrade_premium") return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
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

  const handleCardClick = () => { navigate(`/tickets/${ticket.id}`); };

  const cardShell = cn(
    "relative rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-border cursor-pointer group",
    accent.glow
  );

  // --- Shared header ---
  const renderHeader = () => (
    <>
      <div className={cn("h-1 w-full", accent.line)} />
      <div className={cn("bg-gradient-to-b", accent.gradient)}>
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              {getTierBadge(ticket.tier)}
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/40 rounded-full border border-border/30">
                {ticket.matchCount} Matches
              </span>
            </div>
            {isLocked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : getStatusBadge()}
          </div>
          <h3 className="font-bold text-[15px] text-foreground leading-tight tracking-tight">{ticket.title}</h3>
          {ticketDate && <span className="text-[10px] text-muted-foreground mt-0.5 block">{ticketDate}</span>}
        </div>
      </div>
    </>
  );

  // --- LOCKED ---
  if (isLocked) {
    const Icon = getUnlockButtonIcon();

    return (
      <div className={cardShell} onClick={handleCardClick}>
        {renderHeader()}

        {/* Match list - blurred */}
        <div className="px-3.5 sm:px-4 pb-2 pt-1">
          <div className="rounded-lg bg-muted/20 border border-border/30 divide-y divide-border/20">
            {displayedMatches.map((match, idx) => {
              const parsed = parseMatchName(match.name);
              return (
                <div key={idx} className="flex items-center justify-between gap-2 p-2.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block font-medium">
                      {parsed.homeTeam} <span className="text-muted-foreground font-normal">vs</span> {parsed.awayTeam}
                    </span>
                    {parsed.league && <span className="text-[9px] text-muted-foreground">{parsed.league}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 blur-[5px] opacity-40 select-none">
                    <Badge variant="secondary" className="text-[10px] px-1.5">{match.prediction || "???"}</Badge>
                    <span className="text-xs font-bold text-primary">{match.odds.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {remainingCount > 0 && (
            <p className="text-center text-[10px] text-primary pt-2 flex items-center justify-center gap-0.5 group-hover:underline">
              +{remainingCount} more matches
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          )}
        </div>

        {/* Combined score - blurred */}
        <div className="px-3.5 sm:px-4 pb-2">
          <div className="rounded-lg bg-muted/20 border border-border/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Combined Score</span>
              <span className="font-bold text-lg text-primary blur-[5px] opacity-40 select-none">{ticket.totalOdds.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Unlock button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="px-3.5 sm:px-4 pb-3.5 pt-1">
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex flex-col gap-1.5">
                <Button size="sm" className="w-full gap-1.5 h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-white border-0" disabled={isUnlocking} onClick={(e) => { e.stopPropagation(); onUnlockClick(); }}>
                  {isUnlocking ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Watching ad...</> : <><Sparkles className="h-3.5 w-3.5" />{unlockMethod.primaryMessage}</>}
                </Button>
                <Button size="sm" className={cn("w-full h-7 text-[10px] font-medium", getIsAndroidApp() ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0" : "text-muted-foreground hover:text-foreground")} variant={getIsAndroidApp() ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); handleSecondaryClick(); }}>
                  <Star className="h-3 w-3 mr-1 fill-current" />{unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : (
              <Button variant={unlockMethod.type === "login_required" ? "outline" : "default"} size="sm" className={cn("w-full gap-1.5 h-9 text-xs font-medium", getUnlockButtonStyle())} disabled={isUnlocking} onClick={(e) => { e.stopPropagation(); handleUnlockClick(); }}>
                {isUnlocking ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Watching ad...</> : <>{Icon && <Icon className="h-3.5 w-3.5" />}{getUnlockButtonText(unlockMethod)}</>}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- UNLOCKED ---
  return (
    <div className={cardShell} onClick={handleCardClick}>
      {renderHeader()}

      {/* Match list - revealed */}
      <div className="px-3.5 sm:px-4 pb-2 pt-1">
        <div className="rounded-lg bg-muted/20 border border-border/30 divide-y divide-border/20">
          {displayedMatches.length > 0 ? (
            displayedMatches.map((match, idx) => {
              const parsed = parseMatchName(match.name);
              return (
                <div key={idx} className="flex items-center justify-between gap-2 p-2.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-foreground truncate block font-medium">
                      {parsed.homeTeam} <span className="text-muted-foreground font-normal">vs</span> {parsed.awayTeam}
                    </span>
                    {parsed.league && <span className="text-[9px] text-muted-foreground">{parsed.league}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">{match.prediction}</Badge>
                    <span className="text-xs font-bold text-primary">{match.odds.toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground py-3 text-center">No matches</p>
          )}
        </div>
        {remainingCount > 0 && (
          <p className="text-center text-[10px] text-primary pt-2 flex items-center justify-center gap-0.5 group-hover:underline">
            +{remainingCount} more matches
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        )}
      </div>

      {/* Combined score */}
      <div className="px-3.5 sm:px-4 pb-2">
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Combined Score</span>
            <span className="font-bold text-lg text-primary">{ticket.totalOdds.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* AI Combo footer */}
      <div className="px-3.5 sm:px-4 pb-3.5 pt-1">
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          <span className="text-[11px] font-semibold text-success tracking-wide">AI Combo Available</span>
        </div>
      </div>
    </div>
  );
}

export default TicketCard;
