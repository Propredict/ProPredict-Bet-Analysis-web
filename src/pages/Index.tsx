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
import { TelegramPromoPopup } from "@/components/TelegramPromoPopup";
import { DailyRewardWidget } from "@/components/dashboard/DailyRewardWidget";
import { DailyRewardPopup } from "@/components/dashboard/DailyRewardPopup";
import { DailyRewardStickyBar } from "@/components/dashboard/DailyRewardStickyBar";
import { RateAppCard } from "@/components/dashboard/RateAppCard";
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";


// Heavy components – lazy loaded for faster initial paint
const FeaturedPredictions = lazy(() => import("@/components/dashboard/FeaturedPredictions").then(m => ({ default: m.FeaturedPredictions })));
const MatchPredictions = lazy(() => import("@/components/dashboard/MatchPredictions").then(m => ({ default: m.MatchPredictions })));
const BettingTickets = lazy(() => import("@/components/dashboard/BettingTickets").then(m => ({ default: m.BettingTickets })));
const LeagueStandings = lazy(() => import("@/components/dashboard/LeagueStandings").then(m => ({ default: m.LeagueStandings })));
const TodaysMatches = lazy(() => import("@/components/dashboard/TodaysMatches").then(m => ({ default: m.TodaysMatches })));
const DashboardAIPredictions = lazy(() => import("@/components/dashboard/DashboardAIPredictions").then(m => ({ default: m.DashboardAIPredictions })));
const DashboardWorldCup = lazy(() => import("@/components/dashboard/DashboardWorldCup").then(m => ({ default: m.DashboardWorldCup })));
const DashboardHero = lazy(() => import("@/components/dashboard/DashboardHero").then(m => ({ default: m.DashboardHero })));
const DashboardMatchPreviews = lazy(() => import("@/components/dashboard/DashboardMatchPreviews"));
const DashboardSocialProof = lazy(() => import("@/components/dashboard/DashboardSocialProof").then(m => ({ default: m.DashboardSocialProof })));
const BottomCTA = lazy(() => import("@/components/dashboard/BottomCTA").then(m => ({ default: m.BottomCTA })));

// Android-only dashboard sections
const TodaysTopPicks = lazy(() => import("@/components/dashboard/TodaysTopPicks").then(m => ({ default: m.TodaysTopPicks })));
const RiskOfTheDaySection = lazy(() => import("@/components/dashboard/RiskOfTheDaySection").then(m => ({ default: m.RiskOfTheDaySection })));
const DashboardDailyTips = lazy(() => import("@/components/dashboard/DashboardDailyTips").then(m => ({ default: m.DashboardDailyTips })));
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
          <img src={heroStadium} alt="AI Football Stadium" className="w-full h-[22rem] sm:h-80 md:h-96 object-cover" width={1920} height={864} />
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
            <Link
              to="/get-premium"
              className="inline-flex items-center gap-2 px-4 py-2.5 mt-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-fuchsia-600 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wide shadow-lg shadow-fuchsia-500/40 ring-2 ring-fuchsia-300/40 hover:opacity-95 hover:scale-[1.03] transition-all animate-blink"
              aria-label="Become Premium and unlock all tips and predictions for one month"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
              </svg>
              Be Premium — Unlock All Tips & Predictions for 1 Month
            </Link>
        </div>
        </div>

        {/* Telegram banner — 3D glossy bubble, high-impact CTA */}
        <a
          href="https://t.me/propredictxx"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Android WebView ignora target="_blank" — koristimo bridge da otvori spolja
            const w = window as unknown as { Android?: { openExternal?: (url: string) => void } };
            if (w.Android?.openExternal) {
              e.preventDefault();
              w.Android.openExternal("https://t.me/propredictxx");
            }
          }}
          className="group relative block w-full overflow-hidden rounded-3xl border-b-4 border-[#006699] bg-[#229ED9] text-white shadow-2xl shadow-[#229ED9]/50 transition-all hover:-translate-y-1 hover:shadow-[0_25px_60px_-15px_rgba(34,158,217,0.55)] active:translate-y-0.5 active:border-b-2 active:shadow-lg"
          aria-label="FREE PREMIUM TIPS — Join us on Telegram"
        >
          {/* base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2AABEE] via-[#229ED9] to-[#0088CC]" />
          {/* glossy top highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/10 to-transparent" />
          {/* specular shine streak */}
          <div className="absolute -top-24 -left-10 w-40 h-64 rotate-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-2xl group-hover:translate-x-20 transition-transform duration-700" />
          {/* floating bubbles */}
          <div className="absolute top-3 right-10 w-3 h-3 rounded-full bg-white/40 blur-[1px] animate-pulse" />
          <div className="absolute bottom-4 right-24 w-2 h-2 rounded-full bg-white/30 blur-[1px]" />
          <div className="absolute top-5 left-1/2 w-2 h-2 rounded-full bg-white/30 blur-[1px]" />

          <div className="relative flex items-center justify-between px-4 sm:px-8 py-5 sm:py-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* 3D Telegram logo bubble */}
              <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.25),inset_0_-4px_0_0_rgba(0,0,0,0.08)] shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <svg viewBox="0 0 32 32" className="w-10 h-10 sm:w-12 sm:h-12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="16" cy="16" r="16" fill="#229ED9" />
                  <path d="M7.8 15.8c4.5-2 7.5-3.3 9.1-3.9 4.2-1.8 5.1-2.1 5.7-2.1.1 0 .4 0 .5.1.1.1.2.3.1.5 0 .1-.1.3-.2.5-.3.7-1.9 6.5-2.8 8.7-.4.8-.6 1.2-.9 1.3-.4.1-.6-.1-.8-.3-.7-.5-2.8-1.8-3.8-2.5-.1-.1-.4-.1-.5.1-.1.1-.2.4-.3.6-.2.6-.5 1.6-.7 2.1-.1.3-.2.5-.5.6-.1 0-.4 0-.6-.1-.8-.4-3-1.3-4.7-2.1-1.3-.6-2.7-1.3-3.6-1.8-.6-.3-.9-.5-1.1-.6-.1-.1-.1-.3 0-.4.1-.1.2-.2.5-.3.2 0 .4-.1.6-.1 2.5-.4 5.3-.8 7.1-1.2.2 0 .3 0 .3.1 0 .1 0 .3-.1.4z" fill="white" />
                </svg>
                {/* small sparkle on logo */}
                <span className="absolute -top-1 -right-1 text-lg">✨</span>
              </div>
              <div className="text-left">
                <p className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
                  FREE PREMIUM TIPS
                </p>
                <p className="mt-1.5 text-sm sm:text-base text-white/95 font-semibold">
                  Join us on Telegram — exclusive tips & bonuses
                </p>
              </div>
            </div>
            {/* 3D Join Now button */}
            <div className="hidden sm:flex flex-col items-center shrink-0">
              <div className="relative px-5 py-3 rounded-xl bg-white text-[#0088CC] font-black uppercase tracking-wide shadow-[0_6px_0_0_#006699,0_10px_20px_-5px_rgba(0,0,0,0.25)] group-hover:shadow-[0_4px_0_0_#006699,0_8px_16px_-4px_rgba(0,0,0,0.25)] group-hover:-translate-y-0.5 transition-all duration-200">
                Join Now
                <span className="absolute -right-3 -top-3 text-xl">🚀</span>
              </div>
            </div>
            <span className="sm:hidden text-3xl font-black drop-shadow-md group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>

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

        {/* World Cup 2026 — quick overview + CTA to matches tab */}
        <Suspense fallback={<LazyFallback />}>
          <DashboardWorldCup />
        </Suspense>

        {/* Android: new focused sections */}
        {isAndroid ? (
          <>
            <Suspense fallback={<LazyFallback />}>
              <TodaysTopPicks />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <DashboardDailyTips />
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
          <>
            <AffiliateBannerMelbet />
            <Suspense fallback={<LazyFallback />}>
              <DashboardAIPredictions />
            </Suspense>
          </>
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
            {/* Daily Predictions made by AI (header rendered inside component) */}
            <Suspense fallback={<LazyFallback />}>
              <DashboardAIPredictions />
            </Suspense>

            {/* Top 30 AI Picks */}
            <div className="space-y-3">
              <h3 className="text-2xl font-extrabold text-white text-center tracking-tight">
                Top 30 AI Picks
              </h3>
              <button
                onClick={() => navigate("/match-previews")}
                className="w-full rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/20 via-card to-card p-5 text-center shadow-[0_0_30px_rgba(15,155,142,0.35)] active:scale-[0.99] transition-transform"
              >
                <div className="flex flex-col items-center gap-3">
                  <p className="text-lg font-extrabold text-foreground">
                    🏆 Top 30 AI Picks of the Day
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Highest-confidence picks ranked by our AI.
                  </p>
                  <span className="mt-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-base font-extrabold whitespace-nowrap shadow-lg">
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
      <TelegramPromoPopup />
      {isAndroid && <PicksCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />}
    </>
  );
};

export default Index;
