import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift, CheckCircle2, Clock, XCircle, Target, CalendarDays, Trophy } from "lucide-react";
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
import { useLiveScores } from "@/hooks/useLiveScores";

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
  homeLogo?: string | null;
  awayLogo?: string | null;
}

interface TipCardProps {
  tip: Tip;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onSecondaryUnlock?: () => void;
  isUnlocking?: boolean;
  lockedCTAText?: string;
  lockedCTABrand?: "premium" | "pro";
  /** Label shown in the locked hero, e.g. "Risk of the Day". Defaults to the tier name. */
  lockedLabel?: string;
}

// --- Tier accent helpers ---
const TIER_ACCENT = {
  free: { gradient: "from-primary/15 to-secondary/30", line: "bg-primary", glow: "shadow-md", text: "text-primary", ring: "border-primary/60", halo: "shadow-lg shadow-primary/20", btn: "bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 text-primary-foreground border-0" },
  daily: { gradient: "from-primary/15 to-secondary/30", line: "bg-primary", glow: "shadow-md", text: "text-primary", ring: "border-primary/60", halo: "shadow-lg shadow-primary/20", btn: "bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 text-primary-foreground border-0" },
  exclusive: { gradient: "from-blue-600/15 to-secondary/30", line: "bg-blue-700", glow: "shadow-md", text: "text-blue-700", ring: "border-blue-600/60", halo: "shadow-lg shadow-blue-600/20", btn: "bg-gradient-to-r from-blue-700 to-primary hover:opacity-90 text-primary-foreground border-0" },
  premium: { gradient: "from-primary/15 to-blue-600/5", line: "bg-primary", glow: "shadow-md", text: "text-primary", ring: "border-primary/60", halo: "shadow-lg shadow-primary/20", btn: "bg-gradient-to-r from-primary to-blue-700 hover:opacity-90 text-primary-foreground border-0" },
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


function getLockedCTAText(unlockMethod: UnlockMethod, override?: string): string {
  if (unlockMethod.type === "unlocked") return "";
  if (override) return override;
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock / Otključaj posle reklame";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "🔓 Unlock this winning pick";
  if (unlockMethod.type === "upgrade_premium") return "💎 See now / Pogledaj Tip";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock / Logiraj se i otključaj";
  return "";
}

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, onSecondaryUnlock, isUnlocking = false, lockedCTAText, lockedCTABrand = "premium", lockedLabel }: TipCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();
  const { matches: todayMatches } = useLiveScores({ dateMode: "today", statusFilter: "all" });
  const queryClient = useQueryClient();
  const [adminBusy, setAdminBusy] = useState<null | "delete">(null);
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";

  const teamInitials = (name: string) => name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const findTeamLogo = (name: string, suppliedLogo?: string | null) => {
    if (suppliedLogo) return suppliedLogo;
    const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    const wanted = normalize(name);
    const candidate = todayMatches.find((match) => {
      const home = normalize(match.homeTeam);
      const away = normalize(match.awayTeam);
      return home === wanted || away === wanted || (wanted.length >= 3 && (home.includes(wanted) || wanted.includes(home) || away.includes(wanted) || wanted.includes(away)));
    });
    if (!candidate) return null;
    const home = normalize(candidate.homeTeam);
    return home === wanted || home.includes(wanted) || wanted.includes(home) ? candidate.homeLogo : candidate.awayLogo;
  };

  const homeLogo = findTeamLogo(tip.homeTeam, tip.homeLogo);
  const awayLogo = findTeamLogo(tip.awayTeam, tip.awayLogo);

  const TeamCrest = ({ logo, name }: { logo?: string | null; name: string }) => (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/25 bg-card shadow-sm sm:h-16 sm:w-16">
      {logo ? (
        <img src={logo} alt={`${name} symbol`} loading="lazy" className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
      ) : (
        <span className="text-sm font-black text-primary sm:text-base">{teamInitials(name)}</span>
      )}
    </div>
  );

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
    // Android: Unlock Tip → go to the Premium paywall page
    if (getIsAndroidApp()) {
      navigate("/get-premium");
      return;
    }
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
        return null;
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") return "";
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") return "bg-primary hover:bg-primary/90 text-white border-0";
    if (unlockMethod.type === "android_premium_only") return TIER_ACCENT.premium.btn;
    if (unlockMethod.type === "upgrade_basic") return TIER_ACCENT.exclusive.btn;
    if (unlockMethod.type === "upgrade_premium") {
      if (lockedCTABrand === "pro") return TIER_ACCENT.exclusive.btn;
      return accent.btn;
    }
    return "";
  };


  const getUnlockButtonIcon = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;
    if (unlockMethod.type === "login_required") return LogIn;
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") return Sparkles;
    if (unlockMethod.type === "android_premium_only") return Crown;
    if (unlockMethod.type === "upgrade_basic") return Star;
    if (unlockMethod.type === "upgrade_premium") return lockedCTABrand === "pro" ? Star : Crown;
    return Crown;
  };

  // --- Shared card shell ---
  const cardShell = cn(
    "relative overflow-hidden rounded-lg border-2 border-primary bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
    accent.glow
  );

  // --- Match header (shared) ---
  const renderHeader = () => (
    <>
      <div className={cn("h-1 w-full", accent.line)} />
      <div className="bg-primary/10 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {getTierBadge(tip.tier)}
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {tip.league?.replace(/\s+\d{1,2}[:.]\d{2}\s*$/, "").trim()}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            {!isLocked && getStatusBadge()}
            {(tip.kickoffDate || tip.kickoffTime || tip.kickoff) && (
              <div className="flex items-center gap-1.5 text-foreground">
                {tip.kickoffTime ? <Clock className="h-4 w-4 text-primary" /> : <CalendarDays className="h-4 w-4 text-primary" />}
                <div className="leading-tight">
                  <p className="text-xs font-black">{tip.kickoffTime || tip.kickoff}</p>
                  {tip.kickoffDate ? <p className="text-[9px] text-muted-foreground">{tip.kickoffDate}</p> : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-card px-3 py-4 sm:gap-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest logo={homeLogo} name={tip.homeTeam} />
          <span className="w-full text-balance text-base font-black leading-tight text-foreground sm:text-lg">{tip.homeTeam}</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">VS</div>
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest logo={awayLogo} name={tip.awayTeam} />
          <span className="w-full text-balance text-base font-black leading-tight text-foreground sm:text-lg">{tip.awayTeam}</span>
        </div>
      </div>
    </>
  );

  // --- LOCKED ---
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    const isPro = tip.tier === "exclusive";
    const isPremium = tip.tier === "premium";
    const isDaily = tip.tier === "daily" || tip.tier === "free";

    return (
      <div className={cardShell}>
        {renderHeader()}

        {/* Prediction area - locked hero */}
        <div className="px-3.5 sm:px-4 pb-2 pt-1">
          <div className="overflow-hidden rounded-lg border border-border/40 bg-background/40">
            {/* Panel header */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className={cn("text-[11px] uppercase tracking-[0.16em] font-bold flex items-center gap-1.5", accent.text)}>
                <Target className="h-3.5 w-3.5" />
                Prediction
              </span>
              {!isDaily && (
                <span className={cn("text-[11px] font-bold flex items-center gap-1", accent.text)}>
                  <Lock className="h-3 w-3" />
                  {isPremium ? "Premium Pick" : "Pro Pick"}
                </span>
              )}
            </div>

            <div className="h-px bg-border/40 mx-3" />

            {/* Lock hero */}
            <div className="flex flex-col items-center gap-2 px-3 py-5">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border-2 bg-background/60", accent.ring, accent.halo)}>
                  <Lock className={cn("h-6 w-6", accent.text)} />
              </div>
              <p className="text-xs text-muted-foreground">
                This is a <span className={cn("font-bold", accent.text)}>{lockedLabel || (isPremium ? "PREMIUM" : isPro ? "PRO" : "DAILY")}</span> prediction
              </p>
            </div>

            <div className="h-px bg-border/40 mx-3" />

            {/* Unlock CTA spacer */}
            <div className="py-2" />
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
                <Button size="sm" className={cn("w-full h-7 text-[10px] font-medium", getIsAndroidApp() ? "bg-gradient-to-r from-blue-700 to-primary hover:opacity-90 text-primary-foreground border-0" : "text-muted-foreground hover:text-foreground")} variant={getIsAndroidApp() ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); handleSecondaryClick(); }}>
                  <Star className="h-3 w-3 mr-1 fill-current" />{unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Button
                  variant={unlockMethod.type === "login_required" ? "outline" : "default"}
                  size={unlockMethod.type === "upgrade_premium" || unlockMethod.type === "upgrade_basic" ? "default" : "sm"}
                  className={cn(
                    "w-full gap-1.5 font-semibold",
                    unlockMethod.type === "upgrade_premium" || unlockMethod.type === "upgrade_basic"
                      ? "h-11 text-sm animate-cta-blink"
                      : "h-9 text-xs",
                    getUnlockButtonStyle()
                  )}
                  disabled={isUnlocking}
                  onClick={(e) => { e.stopPropagation(); handleUnlockClick(); }}
                >
                  {isUnlocking ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Watching ad...</> : <>{Icon && <Icon className={cn("shrink-0", unlockMethod.type === "upgrade_premium" || unlockMethod.type === "upgrade_basic" ? "h-4 w-4" : "h-3.5 w-3.5")} />}{getLockedCTAText(unlockMethod, lockedCTAText)}</>}
                </Button>
                {!getIsAndroidApp() && (unlockMethod.type === "upgrade_basic") && (
                  <button
                    className="w-full text-[10px] text-primary/80 hover:text-primary font-medium flex items-center justify-center gap-1 py-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onSecondaryUnlock?.(); }}
                  >
                    🎥 or unlock FREE in app / ili otključaj BESPLATNO u aplikaciji
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
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-success">Our Prediction</span>
          <Star className="h-3.5 w-3.5 text-success fill-success" />
        </div>

        {/* Prediction row */}
        <div className="flex items-center justify-center gap-2 rounded-lg border border-success/45 bg-success/10 p-3">
          <Trophy className="h-5 w-5 shrink-0 text-success" />
          <span className="truncate text-sm font-extrabold uppercase text-success sm:text-base">
            {tip.prediction}
          </span>
        </div>

        {/* FINAL RESULT */}
        {tip.finalResult && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                Final Result
              </span>
            </div>
            <div className="flex items-center justify-center rounded-xl border border-border/50 bg-muted/20 p-2">
              <span className="text-sm font-extrabold text-foreground uppercase tracking-wide truncate">
                {tip.finalResult}
              </span>
            </div>
          </div>
        )}

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
