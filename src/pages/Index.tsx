import { useEffect, useRef, lazy, Suspense, forwardRef, useState } from "react";
import googlePlayBanner from "@/assets/google-play-banner.jfif";
import heroStadiumPlayer from "@/assets/hero-stadium-player.jpg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { DashboardTipsPopup } from "@/components/dashboard/DashboardTipsPopup";

// Lightweight components – eager
import { GuestBanner } from "@/components/GuestBanner";
import { GuestSignInModal } from "@/components/GuestSignInModal";
import { AppDownloadPopup } from "@/components/AppDownloadPopup";
import { TelegramPromoPopup } from "@/components/TelegramPromoPopup";
import { RateAppCard } from "@/components/dashboard/RateAppCard";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";


// Heavy components – lazy loaded for faster initial paint

const BettingTickets = lazy(() => import("@/components/dashboard/BettingTickets").then(m => ({ default: m.BettingTickets })));
const LeagueStandings = lazy(() => import("@/components/dashboard/LeagueStandings").then(m => ({ default: m.LeagueStandings })));
const TodaysMatches = lazy(() => import("@/components/dashboard/TodaysMatches").then(m => ({ default: m.TodaysMatches })));
const DashboardAIPredictions = lazy(() => import("@/components/dashboard/DashboardAIPredictions").then(m => ({ default: m.DashboardAIPredictions })));
const DashboardMatchPreviews = lazy(() => import("@/components/dashboard/DashboardMatchPreviews"));

const BottomCTA = lazy(() => import("@/components/dashboard/BottomCTA").then(m => ({ default: m.BottomCTA })));

// Android-only dashboard sections
const TodaysTopPicks = lazy(() => import("@/components/dashboard/TodaysTopPicks").then(m => ({ default: m.TodaysTopPicks })));
const RiskOfTheDaySection = lazy(() => import("@/components/dashboard/RiskOfTheDaySection").then(m => ({ default: m.RiskOfTheDaySection })));
const DashboardDailyTips = lazy(() => import("@/components/dashboard/DashboardDailyTips").then(m => ({ default: m.DashboardDailyTips })));
const TodaysComboTicket = lazy(() => import("@/components/dashboard/TodaysComboTicket").then(m => ({ default: m.TodaysComboTicket })));
const DiamondPickSection = lazy(() => import("@/components/dashboard/DiamondPickSection").then(m => ({ default: m.DiamondPickSection })));
const TodaysTopTickets = lazy(() => import("@/components/dashboard/TodaysTopTickets").then(m => ({ default: m.TodaysTopTickets })));


import { PicksCategoryModal } from "@/components/dashboard/PicksCategoryModal";


const LazyFallback = forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} className="h-32 flex items-center justify-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" /></div>);
LazyFallback.displayName = "LazyFallback";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const navigate = useNavigate();
  const firedRef = useRef(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);

  // Fetch first name for the hero welcome message
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setFirstName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const raw = data?.full_name || data?.username || null;
        setFirstName(raw ? raw.split(" ")[0] : null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

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
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 shadow-lg">
          <img src={heroStadiumPlayer} alt="Football player celebrating in a stadium at night" className="absolute inset-0 h-full w-full object-cover" width={1920} height={864} />
          <div className="absolute inset-0 bg-gradient-to-r from-sidebar/95 via-sidebar/75 to-sidebar/25" />
          <div className="relative flex flex-col justify-center gap-2 px-5 py-6 text-center sm:px-8 sm:py-8 sm:text-left md:py-10">
            <p className="text-xs font-semibold text-primary-foreground/85 sm:text-sm">
              {firstName ? `Welcome back, ${firstName}!` : "Welcome to ProPredict!"}
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl">
              Play Smart. <span className="text-primary">Bet Better.</span>
            </h1>
            <p className="text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
              AI-powered predictions. Real data. Real results.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:justify-start">
              {isAndroid ? (
                <button onClick={() => setShowCategoryModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-colors hover:bg-primary/90">
                  Check Today's Matches <span aria-hidden="true">→</span>
                </button>
              ) : (
                <Link to="/daily-tips" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-colors hover:bg-primary/90">
                  Check Today's Matches <span aria-hidden="true">→</span>
                </Link>
              )}
              {!isAndroid && (
                <a
                  href="https://play.google.com/store/apps/details?id=com.propredict.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 bg-sidebar/40 px-5 py-3 text-sm font-bold text-primary-foreground backdrop-blur-sm transition-colors hover:bg-sidebar/60"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>
                  Download App
                </a>
              )}
            </div>
            <Link
              to="/get-premium"
              className="mt-1 inline-flex w-fit items-center gap-2 self-center rounded-full bg-gradient-to-r from-primary to-blue-600 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:opacity-95 sm:self-start"
              aria-label="Become Premium and unlock all tips and predictions for one month / Postani Premium korisnik i otključaj sve predikcije na mesec dana"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-yellow-300" fill="currentColor" aria-hidden="true">
                <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
              </svg>
              Be Premium — Unlock All Tips for 1 Month
            </Link>
          </div>
          {/* Script accent text (desktop) */}
          <p className="pointer-events-none absolute right-52 top-6 hidden -rotate-3 select-none text-2xl font-black italic leading-tight text-blue-200/90 drop-shadow-md lg:block">
            More<br />Than Just<br />Predictions
          </p>
          {/* Right-side stats column (desktop), like reference design */}
          <div className="absolute inset-y-0 right-5 hidden w-40 flex-col justify-center gap-2.5 md:flex">
            {[
              { value: "92%", label: "Prediction Accuracy" },
              { value: "10K+", label: "Active Users" },
              { value: "500+", label: "Daily Analyses" },
              { value: "4.9", label: "User Rating" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-primary-foreground/15 bg-sidebar/55 px-3 py-2 backdrop-blur-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/25 text-primary">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-base font-black leading-tight text-primary-foreground">{s.value}</p>
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-primary-foreground/60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard kockice — Daily/Premium Ticket + Sure Odds 2+ / Daily Tips / Premium Tips */}
        {!isAndroid && (
          <Suspense fallback={<LazyFallback />}>
            <BettingTickets />
          </Suspense>
        )}

        {/* Live Scores + League Standings side by side */}
        {!isAndroid && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <Suspense fallback={<LazyFallback />}>
              <TodaysMatches />
            </Suspense>
            <Suspense fallback={<LazyFallback />}>
              <LeagueStandings />
            </Suspense>
          </div>
        )}

        {/* Telegram banner */}
        <div className="grid grid-cols-1 gap-4 items-stretch w-full">


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
          className="group relative flex items-center w-full h-full overflow-hidden rounded-3xl border-b-4 border-[#006699] bg-[#229ED9] text-white shadow-2xl shadow-[#229ED9]/50 transition-all hover:-translate-y-1 hover:shadow-[0_25px_60px_-15px_rgba(34,158,217,0.55)] active:translate-y-0.5 active:border-b-2 active:shadow-lg"
          aria-label="FREE PREMIUM TIPS / Besplatni premium tipovi — Join us on Telegram / Pridruži se na Telegramu"
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

          <div className="relative flex items-center justify-between px-4 sm:px-8 py-5 sm:py-6 h-full">
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
                  Join us on Telegram — exclusive tips & bonuses / Pridruži se na Telegramu — ekskluzivni tipovi i bonusi
                </p>
              </div>
            </div>
            {/* 3D Join Now button */}
            <div className="hidden sm:flex flex-col items-center shrink-0">
              <div className="relative px-5 py-3 rounded-xl bg-white text-[#0088CC] font-black uppercase tracking-wide shadow-[0_6px_0_0_#006699,0_10px_20px_-5px_rgba(0,0,0,0.25)] group-hover:shadow-[0_4px_0_0_#006699,0_8px_16px_-4px_rgba(0,0,0,0.25)] group-hover:-translate-y-0.5 transition-all duration-200">
                Join Now / Pridruži se
                <span className="absolute -right-3 -top-3 text-xl">🚀</span>
              </div>
            </div>
            <span className="sm:hidden text-3xl font-black drop-shadow-md group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>
        </div>















        {/* Rate App Card – all users, inline */}
        <RateAppCard onRate={() => window.dispatchEvent(new Event("propredict:open-rate-popup"))} />

        {/* Daily Reward Widget */}

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
          </>
        ) : null}
        
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

        {isAndroid && (
          <Suspense fallback={<LazyFallback />}>
            <TodaysMatches />
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
      <TelegramPromoPopup />
      {isAndroid && <PicksCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />}
    </>
  );
};

export default Index;
