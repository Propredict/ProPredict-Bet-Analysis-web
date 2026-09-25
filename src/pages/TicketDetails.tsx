import { useState } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Lock, CheckCircle2, Crown, Star, Sparkles, LogIn, Link2, Check, Share2, Home, ChevronRight, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { cn } from "@/lib/utils";
import { parseMatchName } from "@/types/admin";
import { formatCombinedOdds } from "@/lib/formatOdds";
import { toast } from "sonner";
import { useLiveScores } from "@/hooks/useLiveScores";
import { findTicketTeamLogo, TicketTeamCrest } from "@/components/tickets/TicketTeamCrest";

// Get tier-specific OG image
const getTierOgImage = (tier: string) => {
  switch (tier) {
    case "premium":
      return "https://propredict.me/og-image.png"; // Premium tier image
    case "exclusive":
      return "https://propredict.me/og-image.png"; // Pro tier image
    case "daily":
    default:
      return "https://propredict.me/og-image.png"; // Daily tier image
  }
};

// Get tier display name
const getTierDisplayName = (tier: string) => {
  switch (tier) {
    case "premium":
      return "Premium";
    case "exclusive":
      return "Pro";
    case "daily":
    default:
      return "Daily";
  }
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { tickets, isLoading } = useTickets(false);
  const { matches: todayMatches } = useLiveScores({ dateMode: "today", statusFilter: "all" });
  const { getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const ticket = tickets.find((t) => t.id === id);
  const isUnlocking = unlockingId === id;

  // Share URL
  const shareUrl = `https://propredict.me/tickets/${id}`;
  const shareText = ticket 
    ? `Check out this AI prediction: ${ticket.title} on ProPredict!` 
    : "Check out this AI prediction on ProPredict!";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const openUrl = (url: string) => {
    if (window.Android?.openExternal) {
      window.Android.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    openUrl(url);
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openUrl(url);
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    openUrl(url);
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    openUrl(url);
  };

  const handleInstagramShare = async () => {
    // Try native share first (works on mobile - lets user pick Instagram)
    if (navigator.share) {
      try {
        await navigator.share({
          title: ticket?.title || "ProPredict Prediction",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied! Paste it in your Instagram story or bio.", { duration: 4000 });
        }
      }
    } else {
      // Desktop fallback - copy link
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Paste it in your Instagram story or bio.", { duration: 4000 });
    }
  };

  const handleTikTokShare = async () => {
    // Try native share first (works on mobile - lets user pick TikTok)
    if (navigator.share) {
      try {
        await navigator.share({
          title: ticket?.title || "ProPredict Prediction",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied! Paste it in your TikTok video description.", { duration: 4000 });
        }
      }
    } else {
      // Desktop fallback - copy link
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Paste it in your TikTok video description.", { duration: 4000 });
    }
  };

  if (isLoading) {
    return (
      <div className="section-gap flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="section-gap text-center py-20">
        <p className="text-muted-foreground mb-4">Combo not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const effectiveTier = (ticket as any).category === "multi_risk" ? "premium" : ticket.tier;
  const unlockMethod = getUnlockMethod(effectiveTier, "ticket", ticket.id);
  const isLocked = unlockMethod?.type !== "unlocked";

  // Dynamic OG meta data
  const matchCount = ticket.matches?.length || 0;
  const firstMatch = ticket.matches?.[0];
  const parsedFirst = firstMatch ? parseMatchName(firstMatch.match_name) : null;
  const matchTitle = parsedFirst 
    ? `${parsedFirst.homeTeam} vs ${parsedFirst.awayTeam}` 
    : ticket.title;
  const leagueName = parsedFirst?.league || "Football";
  const tierName = getTierDisplayName(ticket.tier);
  const ogImage = getTierOgImage(ticket.tier);

  const ogTitle = `${matchTitle} Prediction – ProPredict`;
  const ogDescription = `AI-powered ${tierName} combo with ${matchCount} match${matchCount !== 1 ? 'es' : ''} for ${leagueName}. Informational purposes only.`;

  // Tier-specific breadcrumb path
  const getTierBreadcrumb = () => {
    switch (ticket.tier) {
      case "premium":
        return { label: "Premium Ticket", path: "/premium-predictions" };
      case "exclusive":
        return { label: "Sure Odds 2+ Ticket", path: "/sure-odds" };
      case "daily":
      default:
        return { label: "Daily Ticket", path: "/daily-predictions" };
    }
  };
  const tierBreadcrumb = getTierBreadcrumb();

  // Breadcrumb JSON-LD schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://propredict.me"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": tierBreadcrumb.label,
        "item": `https://propredict.me${tierBreadcrumb.path}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": ticket.title,
        "item": `https://propredict.me/tickets/${ticket.id}`
      }
    ]
  };

  const getTierBadge = () => {
    switch (ticket.tier) {
      case "daily":
        return (
          <Badge className="bg-accent/20 text-accent border-accent/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Daily
          </Badge>
        );
      case "exclusive":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Star className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUnlockButtonContent = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;

    const buttonConfig = {
      login_required: {
        icon: LogIn,
        text: "Sign in to Unlock / Logiraj se i otključaj",
        className: "",
        variant: "outline" as const,
      },
      watch_ad: {
        icon: Sparkles,
        text: "Watch Ad to Unlock / Otključaj posle reklame",
        className: "bg-primary hover:bg-primary/90 text-white border-0",
        variant: "default" as const,
      },
      upgrade_basic: {
        icon: Star,
        text: "Subscribe to Premium",
        className: "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0",
        variant: "default" as const,
      },
      upgrade_premium: {
        icon: Crown,
        text: "Subscribe to Premium",
        className: "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0",
        variant: "default" as const,
      },
    };

    const config = buttonConfig[unlockMethod.type];
    if (!config) return null;

    return (
      <Button
        variant={config.variant}
        size="lg"
        className={cn("w-full gap-2 h-12", config.className)}
        disabled={isUnlocking}
        onClick={() => handleUnlock("ticket", ticket.id, effectiveTier)}
      >
        {isUnlocking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Watching ad...
          </>
        ) : (
          <>
            <config.icon className="h-4 w-4" />
            {config.text}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="section-gap">
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://propredict.me/tickets/${ticket.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Home className="h-3 w-3" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={tierBreadcrumb.path} className="text-muted-foreground hover:text-foreground">
                  {tierBreadcrumb.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-foreground font-medium truncate max-w-[150px] sm:max-w-[250px]">
                {ticket.title.replace(/\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/, '')}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="overflow-hidden border-2 border-primary/65 bg-card text-foreground shadow-xl">
          {/* Header - VISIBLE */}
          <div className="bg-gradient-to-r from-sidebar via-sidebar-accent to-primary px-4 pb-4 pt-5 text-sidebar-foreground sm:px-6 sm:pb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTierBadge()}
                <span className="text-xs text-sidebar-foreground/70">
                  {ticket.matches?.length || 0} Matches
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Badge className="gap-1 bg-success/20 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Available
                  </Badge>
                )}
                {!isLocked && (
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                    {formatCombinedOdds(ticket.total_odds)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Title - VISIBLE */}
          <div className="border-b border-primary/25 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary px-4 pb-5 sm:px-6">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Trophy className="h-4 w-4" /> Premium multi match ticket</p>
            <h1 className="break-words text-xl font-extrabold uppercase leading-tight text-sidebar-foreground sm:text-2xl">{ticket.title}</h1>
            <p className="mt-1 text-xs font-semibold uppercase text-sidebar-foreground/70">Carefully selected picks</p>
          </div>

          <div className="hidden grid-cols-3 divide-x divide-border border-b border-border bg-secondary/70 py-3 text-center sm:grid">
            <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Matches</p><p className="text-lg font-extrabold">{matchCount}</p></div>
            <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Confidence</p><p className="text-lg font-extrabold text-primary">High</p></div>
            <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Total odds</p><p className="text-lg font-extrabold text-primary">{formatCombinedOdds(ticket.total_odds)}</p></div>
          </div>

          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_5rem] gap-4 border-b border-border bg-secondary/30 px-5 py-2 text-sm font-extrabold uppercase text-muted-foreground sm:grid">
            <span>#</span><span>Match</span><span className="text-center">Pick</span><span className="text-center">Odds</span>
          </div>

          {/* Matches */}
          <div className="space-y-2 bg-card p-2 sm:p-5">
            {isLocked ? (
              // Locked: Show match names visible, predictions/odds blurred
              <>
                {(ticket.matches || []).map((match, idx) => {
                  const parsed = parseMatchName(match.match_name);
                  return (
                    <div key={idx} className="rounded-lg border border-primary/20 bg-card p-2.5 sm:p-4">
                      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground sm:h-9 sm:w-9 sm:text-sm">{idx + 1}</div>
                        {/* Match name — always visible, even when ticket is locked */}
                        <div className="min-w-0">
                          {parsed.league && (
                            <span className="block truncate text-[9px] font-bold uppercase text-muted-foreground sm:text-xs">{parsed.league}</span>
                          )}
                          <div className="mt-1.5 min-w-0 space-y-1 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1 sm:space-y-0">
                            <div className="flex min-w-0 items-center gap-1"><TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" /><span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight sm:truncate sm:text-lg">{parsed.homeTeam}</span></div>
                            <span className="hidden text-[9px] font-bold text-muted-foreground sm:block">vs</span>
                            <div className="flex min-w-0 items-center gap-1"><TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" /><span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight sm:truncate sm:text-lg">{parsed.awayTeam}</span></div>
                          </div>
                          <div className="mt-2 flex min-h-8 items-center justify-center gap-1 rounded-md bg-muted px-2 py-1.5 text-[10px] font-bold text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Locked</div>
                        </div>
                        <div className="text-center"><span className="block text-[9px] font-bold uppercase text-muted-foreground">Odds</span><span className="text-base font-extrabold text-primary blur-sm sm:text-xl">{match.odds.toFixed(2)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              // Unlocked: Full details visible
              <>
                {(ticket.matches || []).map((match, idx) => {
                  const parsed = parseMatchName(match.match_name);
                  return (
                    <div key={idx} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-lg border border-primary/20 bg-card p-2.5 sm:p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground sm:h-9 sm:w-9 sm:text-sm">{idx + 1}</div>
                      <div className="min-w-0">
                        {parsed.league && (
                          <span className="block truncate text-[9px] font-bold uppercase text-muted-foreground sm:text-xs">{parsed.league}</span>
                        )}
                        <div className="mt-1.5 min-w-0 space-y-1 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1 sm:space-y-0">
                          <div className="flex min-w-0 items-center gap-1"><TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" /><span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight sm:truncate sm:text-lg">{parsed.homeTeam}</span></div>
                          <span className="hidden text-[9px] font-bold text-muted-foreground sm:block">vs</span>
                          <div className="flex min-w-0 items-center gap-1"><TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" /><span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight sm:truncate sm:text-lg">{parsed.awayTeam}</span></div>
                        </div>
                        <div className="mt-2 w-full rounded-md bg-muted px-2 py-1.5 text-center"><p className="whitespace-normal break-words text-[13px] font-extrabold leading-tight text-success">PICK: {match.prediction}</p></div>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] font-bold uppercase text-muted-foreground">Odds</span>
                        <span className="text-base font-extrabold text-primary sm:text-xl">{match.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Combined Confidence Score - Blurred when locked */}
          <div className="border-t border-primary/20 bg-secondary/70 px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground"><Target className="h-4 w-4 text-primary" /> Total Odds</span>
              <span className={cn(
                "font-bold text-lg text-primary",
                isLocked && "blur-sm opacity-50"
              )}>
                {formatCombinedOdds(ticket.total_odds)}
              </span>
            </div>
          </div>

          {/* Unlocked badge footer - only when unlocked */}
          {!isLocked && (
            <div className="px-4 py-3 border-t border-gray-200">
               <Badge className="w-full justify-center gap-2 py-2 bg-success/20 text-success border-success/30">
                 <CheckCircle2 className="h-4 w-4" />
                 AI Combo Available
               </Badge>
            </div>
          )}

          {/* Unlock Button - only when locked, NOT BLURRED */}
          {isLocked && (
            <div className="p-4 border-t border-gray-200">
              {getUnlockButtonContent()}
            </div>
          )}

          {/* Share Section */}
           <div className="border-t border-border bg-secondary/45 p-4">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4" />
                <span>Share this AI Combo</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Twitter/X */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTwitterShare}
                className="gap-2 h-9 px-3 bg-gray-800 text-white border-gray-700 hover:bg-[#1DA1F2] hover:border-[#1DA1F2]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="hidden sm:inline">Twitter</span>
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFacebookShare}
                className="gap-2 h-9 px-3 bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#1877F2]/90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="hidden sm:inline">Facebook</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleInstagramShare}
                className="gap-2 h-9 px-3 bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white border-0 hover:opacity-90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="hidden sm:inline">Instagram</span>
              </Button>

              {/* WhatsApp */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                className="gap-2 h-9 px-3 bg-[#25D366] text-white border-[#25D366] hover:bg-[#25D366]/90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>

              {/* Telegram */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTelegramShare}
                className="gap-2 h-9 px-3 bg-[#229ED9] text-white border-[#229ED9] hover:bg-[#229ED9]/90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="hidden sm:inline">Telegram</span>
              </Button>


              {/* Copy Link */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className={cn(
                  "gap-2 h-9 px-3 transition-colors bg-primary text-white border-primary hover:bg-primary/90",
                  copied && "bg-success text-white border-success"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}