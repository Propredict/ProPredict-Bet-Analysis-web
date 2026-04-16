import { useEffect, useRef, lazy, Suspense, forwardRef } from "react";
import googlePlayBanner from "@/assets/google-play-banner.jfif";
import heroStadium from "@/assets/hero-stadium.jpg";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { DashboardTipsPopup } from "@/components/dashboard/DashboardTipsPopup";

// Lightweight components – eager
import { GuestBanner } from "@/components/GuestBanner";
import { GuestSignInModal } from "@/components/GuestSignInModal";
import { AppDownloadPopup } from "@/components/AppDownloadPopup";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { DailyRewardWidget } from "@/components/dashboard/DailyRewardWidget";
import { DailyRewardPopup } from "@/components/dashboard/DailyRewardPopup";
import { DailyRewardStickyBar } from "@/components/dashboard/DailyRewardStickyBar";
import { RateAppCard } from "@/components/dashboard/RateAppCard";
import { useAppRating } from "@/hooks/useAppRating";

// Heavy components – lazy loaded for faster initial paint
const FeaturedPredictions = lazy(() => import("@/components/dashboard/FeaturedPredictions").then(m => ({ default: m.FeaturedPredictions })));
const MatchPredictions = lazy(() => import("@/components/dashboard/MatchPredictions").then(m => ({ default: m.MatchPredictions })));
const BettingTickets = lazy(() => import("@/components/dashboard/BettingTickets").then(m => ({ default: m.BettingTickets })));
const LeagueStandings = lazy(() => import("@/components/dashboard/LeagueStandings").then(m => ({ default: m.LeagueStandings })));
const TodaysMatches = lazy(() => import("@/components/dashboard/TodaysMatches").then(m => ({ default: m.TodaysMatches })));
const DashboardAIPredictions = lazy(() => import("@/components/dashboard/DashboardAIPredictions").then(m => ({ default: m.DashboardAIPredictions })));
const DashboardHero = lazy(() => import("@/components/dashboard/DashboardHero").then(m => ({ default: m.DashboardHero })));
const DashboardMatchPreviews = lazy(() => import("@/components/dashboard/DashboardMatchPreviews"));
const DashboardSocialProof = lazy(() => import("@/components/dashboard/DashboardSocialProof").then(m => ({ default: m.DashboardSocialProof })));
const BottomCTA = lazy(() => import("@/components/dashboard/BottomCTA").then(m => ({ default: m.BottomCTA })));

// Android-only dashboard sections
const TodaysTopPicks = lazy(() => import("@/components/dashboard/TodaysTopPicks").then(m => ({ default: m.TodaysTopPicks })));
const RiskOfTheDaySection = lazy(() => import("@/components/dashboard/RiskOfTheDaySection").then(m => ({ default: m.RiskOfTheDaySection })));
const TodaysComboTicket = lazy(() => import("@/components/dashboard/TodaysComboTicket").then(m => ({ default: m.TodaysComboTicket })));


const LazyFallback = forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} className="h-32 flex items-center justify-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" /></div>);
LazyFallback.displayName = "LazyFallback";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const navigate = useNavigate();
  const firedRef = useRef(false);
  const { setShowPopup: showRatingPopup } = useAppRating();

  // Android only: show one interstitial on Home (max 1 per app session)
  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      maybeShowInterstitial("home");
    }
  }, [maybeShowInterstitial]);
  return (
    <>
      <Helmet>
        <title>ProPredict – AI Sports Analysis & Predictions</title>
        <meta name="description" content="AI-powered sports predictions, match analysis, and statistics for entertainment and informational purposes only." />
        <meta property="og:title" content="ProPredict – AI Sports Analysis & Predictions" />
        <meta property="og:description" content="AI-powered sports predictions, match analysis, and statistics for entertainment and informational purposes only." />
        <meta property="og:image" content="https://propredict.me/og-image.png" />
        <meta property="og:url" content="https://propredict.me/" />
        <meta property="og:type" content="website" />
      </Helmet>
    <div className="space-y-6">
        <GuestBanner />
        <DashboardTipsPopup />

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl shadow-lg shadow-primary/10">
          <img src={heroStadium} alt="AI Football Stadium" className="w-full h-64 sm:h-80 md:h-96 object-cover" width={1920} height={864} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 space-y-3">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Welcome to ProPredict 👋</h1>
            <p className="text-base sm:text-lg md:text-2xl font-extrabold text-primary drop-shadow leading-tight">Today's Best Football Predictions Are Ready ⚽</p>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
              AI-powered picks, probabilities and match insights updated daily.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Link to="/daily-tips" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md">
                Check Today's Matches
              </Link>
              {!isAndroid && (
                <a href="https://play.google.com/store/apps/details?id=com.propredict.app" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-lg border border-primary/40 text-primary text-sm font-bold hover:bg-primary/10 transition-colors">
                  Download App 🔓
                </a>
              )}
            </div>
            <p className="text-xs text-primary font-semibold">🔥 {(23000 + Math.floor(Math.random() * 4000)).toLocaleString()}+ users checked today • free picks available</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">⭐⭐⭐⭐⭐ Trusted by 10,000+ football fans</p>
          </div>
        </div>

        {/* Social Proof Section */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardSocialProof />
        </Suspense>













        {/* App Promo CTA – Web only */}
        {!isAndroid && (
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-primary/10 p-5 sm:p-8 hover:border-primary/50 transition-colors"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_70%)]" />
            <div className="relative flex flex-col items-center text-center space-y-3">
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Unlock More Winning Picks 🚀
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                Get access to <span className="text-primary font-bold">PRO tips</span>, <span className="text-primary font-bold">combo tickets</span>, <span className="text-primary font-bold">Diamond Picks</span> and full match analysis.
              </p>
              <p className="text-xs text-primary font-semibold">⚡ Updated daily • Limited picks • High confidence</p>
              <div className="inline-flex items-center gap-2 mt-1 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 transition-colors">
                Download App – Unlock Now 🔓
              </div>
              <p className="text-[10px] text-muted-foreground">Only available in app</p>
            </div>
          </a>
        )}

        {/* Rate App Card – all users, inline */}
        <RateAppCard onRate={() => showRatingPopup(true)} />

        {/* Daily Reward Widget */}
        <DailyRewardWidget />

        <Suspense fallback={<LazyFallback />}>
          <MatchPredictions />
        </Suspense>
        <Suspense fallback={<LazyFallback />}>
          <BettingTickets />
        </Suspense>
        
        {/* Two-column layout for Standings and Live Scores */}
        <Suspense fallback={<LazyFallback />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!isAndroid && <LeagueStandings />}
            <TodaysMatches />
          </div>
        </Suspense>
        
        {/* AI Predictions Section – web only */}
        {!isAndroid && (
          <Suspense fallback={<LazyFallback />}>
            <DashboardAIPredictions />
          </Suspense>
        )}

        {/* Match Previews Section – web only */}
        {!isAndroid && (
          <Suspense fallback={<LazyFallback />}>
            <DashboardMatchPreviews />
          </Suspense>
        )}


        <Suspense fallback={<LazyFallback />}>
          <BottomCTA />
        </Suspense>

        {/* SEO internal link */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          👉 Learn more about how our AI prediction model works →{" "}
          <Link to="/how-ai-works" className="text-primary hover:underline font-medium">
            How AI Works
          </Link>
        </p>

        {/* Compliance Disclaimer */}
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
          Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
        </p>
      </div>
      <GuestSignInModal />
      <AppDownloadPopup />
      <ExitIntentPopup />
      <DailyRewardPopup />
      <DailyRewardStickyBar />
    </>
  );
};

export default Index;
