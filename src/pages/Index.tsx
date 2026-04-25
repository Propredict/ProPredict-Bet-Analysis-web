import { useEffect, useRef, lazy, Suspense, forwardRef, useState } from "react";
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
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";


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
const DiamondPickSection = lazy(() => import("@/components/dashboard/DiamondPickSection").then(m => ({ default: m.DiamondPickSection })));
const TodaysTopTickets = lazy(() => import("@/components/dashboard/TodaysTopTickets").then(m => ({ default: m.TodaysTopTickets })));
const MultiRiskTicketSection = lazy(() => import("@/components/dashboard/MultiRiskTicketSection").then(m => ({ default: m.MultiRiskTicketSection })));

import { PicksCategoryModal } from "@/components/dashboard/PicksCategoryModal";


const LazyFallback = forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} className="h-32 flex items-center justify-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" /></div>);
LazyFallback.displayName = "LazyFallback";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const navigate = useNavigate();
  const firedRef = useRef(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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
          <img src={heroStadium} alt="AI Football Stadium" className="w-full h-[28rem] sm:h-80 md:h-96 object-cover" width={1920} height={864} />
          <div className="absolute inset-0 bg-background/70 sm:bg-transparent sm:bg-gradient-to-t sm:from-background sm:via-background/85 sm:to-background/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 py-4 space-y-2 sm:space-y-3">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-foreground [text-shadow:_0_2px_12px_rgba(0,0,0,0.95),_0_0_4px_rgba(0,0,0,0.9)]">Welcome to ProPredict 👋</h1>
            <p className="text-base sm:text-lg md:text-2xl font-extrabold text-primary drop-shadow leading-tight">Today's Best Football Predictions Are Ready ⚽</p>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
              AI-powered picks, probabilities and match insights updated daily.
            </p>
            {!isAndroid && (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Get access to <span className="text-primary font-bold">PRO tips</span>, <span className="text-primary font-bold">combo tickets</span>, <span className="text-primary font-bold">Diamond Picks</span> and full match analysis.
              </p>
            )}
            <div className="flex items-center gap-3 pt-1">
              {isAndroid ? (
                <button onClick={() => setShowCategoryModal(true)} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md">
                  Check Today's Matches
                </button>
              ) : (
                <Link to="/daily-tips" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md">
                  Check Today's Matches
                </Link>
              )}
              {!isAndroid && (
                <a
                  href="https://play.google.com/store/apps/details?id=com.propredict.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-extrabold hover:opacity-90 transition-all shadow-lg shadow-amber-500/40 animate-pulse ring-2 ring-amber-300/50"
                >
                  ⬇️ Download App 🔓
                </a>
              )}
            </div>
            <p className="text-xs text-primary font-semibold">🔥 {(23000 + Math.floor(Math.random() * 4000)).toLocaleString()}+ users checked today • free picks available</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">⭐⭐⭐⭐⭐ Trusted by 10,000+ football fans</p>
            <a
              href="https://t.me/propredictxx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 mt-1 rounded-full bg-[#229ED9] hover:bg-[#1c8bc1] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#229ED9]/30 transition-all hover:scale-[1.03]"
              aria-label="Join us on Telegram"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
              </svg>
              Join us on Telegram
            </a>
          </div>
        </div>

        {/* Sponsored: 1xBet affiliate banner – web only */}
        <AffiliateBanner1xBet />

        {/* Social Proof Section */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardSocialProof />
        </Suspense>













        {/* Rate App Card – all users, inline */}
        <RateAppCard onRate={() => window.dispatchEvent(new Event("propredict:open-rate-popup"))} />

        {/* Daily Reward Widget */}
        <DailyRewardWidget />

        {/* Android: new focused sections */}
        {isAndroid ? (
          <>
            <Suspense fallback={<LazyFallback />}>
              <TodaysTopPicks />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <RiskOfTheDaySection />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <DiamondPickSection />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <TodaysTopTickets />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <MultiRiskTicketSection />
            </Suspense>
          </>
        ) : (
          <>
            <Suspense fallback={<LazyFallback />}>
              <MatchPredictions />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <BettingTickets />
            </Suspense>
          </>
        )}
        
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

        {/* Live Scores — placed below Top 30 AI Picks */}
        {isAndroid && (
          <>
            {/* Daily Predictions made by AI */}
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white text-center tracking-tight">
                Daily Predictions made by AI
              </h3>
              <Suspense fallback={<LazyFallback />}>
                <DashboardAIPredictions />
              </Suspense>
            </div>

            {/* Top 30 AI Picks */}
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white text-center tracking-tight">
                Top 30 AI Picks
              </h3>
              <button
                onClick={() => navigate("/ai-predictions?tab=top-picks")}
                className="w-full rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 text-left shadow-[0_0_20px_rgba(15,155,142,0.25)] active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-foreground">
                      🏆 Top 30 AI Picks of the Day
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Highest-confidence picks ranked by our AI.
                    </p>
                  </div>
                  <span className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap shadow-md">
                    See all →
                  </span>
                </div>
              </button>
            </div>
          </>
        )}

        <Suspense fallback={<LazyFallback />}>
          <TodaysMatches />
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
      {isAndroid && <PicksCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />}
    </>
  );
};

export default Index;
