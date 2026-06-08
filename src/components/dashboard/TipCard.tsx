import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift, CheckCircle2, Clock, XCircle, TrendingUp, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export type TipResult = "pending" | "won" | "lost";

export interface Tip {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  confidence: number;
  kickoff: string;
  kickoffTime?: string;
  kickoffDate?: string;
  tier: ContentTier;
  result?: TipResult | null;
  finalResult?: string | null;
  extraNote?: { label: string; value: string } | null;
}

interface TipCardProps {
  tip: Tip;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onSecondaryUnlock?: () => void;
  isUnlocking?: boolean;
}

// --- Tier accent helpers ---
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

// Deterministic pseudo-random unlock % per tip (72-94 range)
function getSocialProofPct(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return 72 + (Math.abs(hash) % 23);
}

function getLockedCTAText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "unlocked") return "";
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "🔓 Unlock this winning pick";
  if (unlockMethod.type === "upgrade_premium") return "💎 Unlock full AI edge";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, onSecondaryUnlock, isUnlocking = false }: TipCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const [adminBusy, setAdminBusy] = useState<null | "delete">(null);
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";

  const accent = TIER_ACCENT[tip.tier] || TIER_ACCENT.daily;

  const adminDelete = async () => {
    if (!confirm("Delete this tip?")) return;
    setAdminBusy("delete");
    const { error } = await (supabase as any).from("tips").delete().eq("id", tip.id);
    setAdminBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Tip deleted");
    queryClient.invalidateQueries({ queryKey: ["tips"] });
  };

  const renderAdminBar = () => {
    return null;
  };

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
    const status = tip.result ?? "pending";
    switch (status) {
      case "won":
        return (
          <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />Won ✅
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-2">
            <XCircle className="h-3 w-3 mr-1" />Missed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10 text-[10px] px-2">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
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

  // --- Shared card shell ---
  const cardShell = cn(
    "relative rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-border",
    accent.glow
  );

  // --- Match header (shared) ---
  const renderHeader = () => (
    <>
      {/* Top accent line */}
      <div className={cn("h-1 w-full", accent.line)} />

      {/* Gradient overlay behind header */}
      <div className={cn("bg-gradient-to-b", accent.gradient)}>
        <div className="p-3.5 sm:p-4">
          {/* Badges row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              {getTierBadge(tip.tier)}
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/40 rounded-full border border-border/30">
                {tip.league?.replace(/\s+\d{1,2}[:.]\d{2}\s*$/, "").trim()}
              </span>
            </div>
            {/* Status — hide when locked */}
            {!isLocked && getStatusBadge()}
          </div>

          {/* Match name — always visible, even when locked */}
          <div className="flex items-center justify-center gap-2">
            <span className="flex-1 text-right font-bold text-[15px] text-foreground leading-tight tracking-tight px-2.5 py-1 rounded-lg border border-border/50 bg-muted/20 truncate">
              {tip.homeTeam}
            </span>
            <span className="shrink-0 text-muted-foreground font-normal text-xs">vs</span>
            <span className="flex-1 text-left font-bold text-[15px] text-foreground leading-tight tracking-tight px-2.5 py-1 rounded-lg border border-border/50 bg-muted/20 truncate">
              {tip.awayTeam}
            </span>
          </div>
          {(tip.kickoffDate || tip.kickoffTime || tip.kickoff) && (
            <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {[tip.kickoffDate || (!tip.kickoffTime ? tip.kickoff : ""), tip.kickoffTime]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // --- LOCKED ---
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    const isPro = tip.tier === "exclusive";
    const isPremium = tip.tier === "premium";

    return (
      <div className={cardShell}>
        {renderHeader()}

        {/* Prediction area - locked with hooks */}
        <div className="px-3.5 sm:px-4 pb-2 pt-1">
          <div className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Prediction</span>
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {isPremium ? "Premium Pick" : "Pro Pick"}
              </span>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="px-3.5 sm:px-4 pb-1">
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              👀 {getSocialProofPct(tip.id)}% of users unlocked this
            </span>
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
              <div className="flex flex-col gap-1.5">
                <Button variant={unlockMethod.type === "login_required" ? "outline" : "default"} size="sm" className={cn("w-full gap-1.5 h-9 text-xs font-semibold", getUnlockButtonStyle())} disabled={isUnlocking} onClick={(e) => { e.stopPropagation(); handleUnlockClick(); }}>
                  {isUnlocking ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Watching ad...</> : <>{Icon && <Icon className="h-3.5 w-3.5" />}{getLockedCTAText(unlockMethod)}</>}
                </Button>
                {!getIsAndroidApp() && (unlockMethod.type === "upgrade_basic") && (
                  <button
                    className="w-full text-[10px] text-primary/80 hover:text-primary font-medium flex items-center justify-center gap-1 py-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onSecondaryUnlock?.(); }}
                  >
                    🎥 or unlock FREE in app
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {renderAdminBar()}
      </div>
    );
  }

  // --- UNLOCKED ---
  return (
    <div className={cardShell}>
      {renderHeader()}

      {/* Prediction area - revealed */}
      <div className="px-3.5 sm:px-4 pb-3.5 pt-1 space-y-2">
        {/* OUR PREDICTION section header */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Star className="h-3.5 w-3.5 text-success fill-success" />
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-success">
            {tip.finalResult ? "Final Result" : "Our Prediction"}
          </span>
          <Star className="h-3.5 w-3.5 text-success fill-success" />
        </div>

        {/* Prediction row */}
        <div className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-gradient-to-r from-success/10 to-success/5 p-2.5">
          <span className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wide truncate">
            {tip.finalResult || tip.prediction}
          </span>
        </div>

        {tip.extraNote && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {tip.extraNote.label}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {tip.extraNote.value}
            </span>
          </div>
        )}
      </div>
      {renderAdminBar()}
    </div>
  );
}
