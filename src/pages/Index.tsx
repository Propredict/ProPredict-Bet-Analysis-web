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


const LazyFallback = forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} className="h-32 flex items-center justify-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" /></div>);
LazyFallback.displayName = "LazyFallback";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const navigate = useNavigate();
  const firedRef = useRef(false);

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

        {/* Google Play Download Banner – Web only */}
        {!isAndroid && (
          <a
            href="https://play.google.com/store/apps/details?id=com.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-5 rounded-lg border border-primary/30 bg-card shadow-md hover:border-primary/50 transition-all group cursor-pointer overflow-hidden px-2 py-1.5"
          >
            <img 
              src={googlePlayBanner} 
              alt="Google Play" 
              className="h-20 sm:h-24 w-auto shrink-0 object-cover rounded-md"
            />
            <div className="flex flex-col items-center gap-2.5">
              <div className="text-center">
                <p className="text-base sm:text-xl font-bold text-foreground">📱 ProPredict is now on Google Play!</p>
                <p className="text-xs sm:text-sm text-muted-foreground">📲 Get FREE Daily and Pro tips on the app — completely free!</p>
              </div>
              <span className="rounded-lg bg-gradient-to-r from-[hsl(30,100%,50%)] to-[hsl(145,70%,45%)] px-7 py-2 text-sm sm:text-base font-bold text-white animate-pulse whitespace-nowrap shadow-lg shadow-[hsl(30,100%,50%)]/20">
                ⬇ Download App
              </span>
            </div>
          </a>
        )}

        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl shadow-lg shadow-primary/10">
          <img src={heroStadium} alt="AI Football Stadium" className="w-full h-56 sm:h-72 object-cover" width={1920} height={864} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 space-y-3">
            <h1 className="text-xl md:text-3xl font-extrabold text-foreground drop-shadow-lg">Welcome to ProPredict</h1>
            <p className="text-xs md:text-sm font-semibold text-primary drop-shadow">AI-Powered Football Predictions & Match Analysis</p>
            <p className="text-[11px] md:text-xs text-muted-foreground max-w-md leading-relaxed">
              Get smart AI predictions, live match tracking and advanced football insights — all in one place.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Link to="/ai-predictions" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-md">
                Explore Predictions
              </Link>
              {!isAndroid && (
                <a href="https://play.google.com/store/apps/details?id=com.propredict.app" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary/10 transition-colors">
                  Download App
                </a>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">⭐⭐⭐⭐⭐ Trusted by 10,000+ football fans</p>
          </div>
        </div>

        {/* Social Proof Section */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardSocialProof />
        </Suspense>













        {/* App Promo CTA – Web only */}
        {!isAndroid && (
          <a
            href="https://play.google.com/store/apps/details?id=me.propredict.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-primary/10 p-5 sm:p-8 hover:border-primary/50 transition-colors"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_70%)]" />
            <div className="relative flex flex-col items-center text-center space-y-3">
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                📱 More Tips, Combos &amp; Match Analysis on the App
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                Unlock <span className="text-primary font-bold">Pro Tips &amp; Combos</span> without a subscription — 
                watch a short ad to access <span className="text-primary font-bold">Diamond Picks</span>, 
                <span className="text-primary font-bold">Risk of the Day</span> and full AI match analysis 
                directly on the app.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>⭐⭐⭐⭐⭐</span>
                <span>Trusted by 1,000+ users</span>
              </div>
              <div className="inline-flex items-center gap-2 mt-1 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a2.372 2.372 0 01-.61-1.6V3.414c0-.612.222-1.17.609-1.6zm.77-.674l11.15 6.423L12.56 10.5 4.38 1.14zM22 12c0 .695-.356 1.336-.947 1.7l-3.14 1.81-3.36-3.51 3.36-3.51 3.14 1.81c.591.364.947 1.005.947 1.7zM4.38 22.86l8.18-9.36 2.97 3.1-11.15 6.26z"/>
                </svg>
                Get it on Google Play
              </div>
            </div>
          </a>
        )}

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
            <LeagueStandings />
            <TodaysMatches />
          </div>
        </Suspense>
        
        {/* AI Predictions Section */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardAIPredictions />
        </Suspense>

        {/* Match Previews Section */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardMatchPreviews />
        </Suspense>


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
