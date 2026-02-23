import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Lock, CheckCircle2, Crown, Star, Sparkles, LogIn, Link2, Check, Share2, Home, ChevronRight } from "lucide-react";
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
import { toast } from "sonner";

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

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
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

  const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
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
        return { label: "Premium AI Combos", path: "/premium-tickets" };
      case "exclusive":
        return { label: "Pro AI Combos", path: "/exclusive-tickets" };
      case "daily":
      default:
        return { label: "Daily AI Combos", path: "/daily-tickets" };
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
        text: "Sign in to Unlock",
        className: "",
        variant: "outline" as const,
      },
      watch_ad: {
        icon: Sparkles,
        text: "Watch Ad to Unlock",
        className: "bg-primary hover:bg-primary/90 text-white border-0",
        variant: "default" as const,
      },
      upgrade_basic: {
        icon: Star,
        text: "Subscribe to Pro",
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
        onClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
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
      <div className="space-y-4 max-w-3xl mx-auto">
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

        <Card className={cn(
          "overflow-hidden bg-white text-gray-900 border-gray-200 shadow-lg",
          !isLocked ? "border-primary/40" : "border-gray-200"
        )}>
          {/* Header - VISIBLE */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTierBadge()}
                <span className="text-xs text-gray-500">
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
                    {ticket.total_odds?.toFixed(2) || "1.00"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Title - VISIBLE */}
          <div className="px-3 sm:px-4 pb-2 sm:pb-3">
            <h1 className="font-bold text-sm sm:text-base text-gray-900">{ticket.title}</h1>
          </div>

          {/* Matches */}
          <div className="px-4 pb-3 space-y-2">
            {isLocked ? (
              // Locked: Show match names visible, predictions/odds blurred
              <>
                {(ticket.matches || []).map((match, idx) => {
                  const parsed = parseMatchName(match.match_name);
                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        {/* Match name - VISIBLE */}
                        <div className="flex-1 mr-4 min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate block">
                            {parsed.homeTeam} vs {parsed.awayTeam}
                          </span>
                          {parsed.league && (
                            <span className="text-xs text-gray-500">{parsed.league}</span>
                          )}
                        </div>
                        {/* Prediction & Confidence - BLURRED */}
                        <div className="flex items-center gap-2 blur-sm opacity-50">
                          <Badge variant="secondary" className="bg-primary/15 text-primary font-bold text-xs border border-primary/30">
                            {match.prediction}
                          </Badge>
                          <span className="text-sm font-medium text-primary">{match.odds.toFixed(2)}</span>
                        </div>
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
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 mr-4 min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate block">
                          {parsed.homeTeam} vs {parsed.awayTeam}
                        </span>
                        {parsed.league && (
                          <span className="text-xs text-gray-500">{parsed.league}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary" className="bg-primary/15 text-primary font-bold text-xs border border-primary/30">
                          {match.prediction}
                        </Badge>
                        <span className="text-sm font-medium text-primary">{match.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Combined Confidence Score - Blurred when locked */}
          <div className="px-4 py-3 bg-primary/10 border-t border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Combined Confidence Score</span>
              <span className={cn(
                "font-bold text-lg text-primary",
                isLocked && "blur-sm opacity-50"
              )}>
                {ticket.total_odds?.toFixed(2) || "1.00"}
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
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                className="gap-2 h-9 px-3 border-gray-200 text-gray-700 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30"
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
                className="gap-2 h-9 px-3 border-gray-200 text-gray-700 hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30"
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
                className="gap-2 h-9 px-3 border-gray-200 text-gray-700 hover:bg-[#E4405F]/10 hover:text-[#E4405F] hover:border-[#E4405F]/30"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="hidden sm:inline">Instagram</span>
              </Button>

              {/* TikTok */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTikTokShare}
                className="gap-2 h-9 px-3 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span className="hidden sm:inline">TikTok</span>
              </Button>

              {/* Copy Link */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className={cn(
                  "gap-2 h-9 px-3 transition-colors border-gray-200 text-gray-700",
                  copied && "bg-success/10 text-success border-success/30"
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