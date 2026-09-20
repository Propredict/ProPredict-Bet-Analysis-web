import { useEffect, useRef, lazy, Suspense, forwardRef, useState } from "react";
import googlePlayBanner from "@/assets/google-play-banner.jfif";
import heroStadiumPlayer from "@/assets/hero-stadium-player.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
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



// Heavy components – lazy loaded for faster initial paint

const BettingTickets = lazy(() => import("@/components/dashboard/BettingTickets").then(m => ({ default: m.BettingTickets })));
const LeagueStandings = lazy(() => import("@/components/dashboard/LeagueStandings").then(m => ({ default: m.LeagueStandings })));
const TodaysMatches = lazy(() => import("@/components/dashboard/TodaysMatches").then(m => ({ default: m.TodaysMatches })));
const DashboardAIPredictions = lazy(() => import("@/components/dashboard/DashboardAIPredictions").then(m => ({ default: m.DashboardAIPredictions })));
const DashboardMatchPreviews = lazy(() => import("@/components/dashboard/DashboardMatchPreviews"));




const LazyFallback = forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} className="h-32 flex items-center justify-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" /></div>);
LazyFallback.displayName = "LazyFallback";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const firedRef = useRef(false);
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();
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
          <div className="relative flex flex-col justify-center gap-2 px-5 py-6 text-center sm:px-8 sm:py-8 sm:text-left md:py-10 xl:flex-row xl:items-center xl:gap-4 xl:pr-60">
            <div className="flex min-w-0 flex-col justify-center gap-2 xl:flex-1">
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
              <Link to="/daily-tips" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-colors hover:bg-primary/90">
                Check Today's Matches <span aria-hidden="true">→</span>
              </Link>
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
            {/* Center Premium Access block (desktop) — centered over the hero image on wide screens */}
            <Link
              to="/get-premium"
              aria-label="Premium Access all month — Postani Premium korisnik"
              className="hidden w-[38%] max-w-md shrink-0 select-none flex-col items-center gap-1 text-center xl:flex min-[1350px]:absolute min-[1350px]:left-[56%] min-[1350px]:top-1/2 min-[1350px]:z-10 min-[1350px]:w-auto min-[1350px]:max-w-none min-[1350px]:-translate-x-1/2 min-[1350px]:-translate-y-1/2 min-[1350px]:rounded-2xl min-[1350px]:bg-sidebar/20 min-[1350px]:px-6 min-[1350px]:py-4 min-[1350px]:backdrop-blur-[2px]"
            >
            <svg viewBox="0 0 24 24" className="mb-1 h-9 w-9 text-yellow-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" fill="currentColor" aria-hidden="true">
              <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
            </svg>
            <p className="whitespace-nowrap text-2xl font-black uppercase leading-tight tracking-tight text-primary-foreground drop-shadow-md">
              Premium Access. <span className="text-primary">All Month.</span>
            </p>
            <p className="text-sm font-semibold text-primary-foreground/90 sm:text-base">
              All Premium Tips, AI Predictions &amp; Sure Odds 2+ included.
            </p>
            <p className="mt-1 text-lg font-black uppercase leading-tight tracking-tight text-blue-300/95 drop-shadow-md xl:text-xl">
              Premium pristup. CEO mesec.
            </p>
            <p className="text-sm font-semibold text-primary-foreground/85">
              Svi Premium tiketi, AI predikcije i Sure Odds 2+ su uključeni.
            </p>
            </Link>
          </div>
          {/* Script accent text (desktop) */}
          <p className="pointer-events-none absolute right-44 top-3 hidden -rotate-3 select-none text-xl font-black italic leading-tight text-blue-200/90 drop-shadow-md lg:block">
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
        <Suspense fallback={<LazyFallback />}>
          <BettingTickets />
        </Suspense>

        {/* Live Scores + League Standings side by side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <Suspense fallback={<LazyFallback />}>
            <TodaysMatches />
          </Suspense>
          <Suspense fallback={<LazyFallback />}>
            <LeagueStandings />
          </Suspense>
        </div>
















        {/* Rate App Card – all users, inline */}
        <RateAppCard onRate={() => window.dispatchEvent(new Event("propredict:open-rate-popup"))} />

        {/* Daily Reward Widget */}

        <Suspense fallback={<LazyFallback />}>
          <DashboardAIPredictions />
        </Suspense>

        {isAdmin && (
          <Suspense fallback={<LazyFallback />}>
            <DashboardMatchPreviews />
          </Suspense>
        )}

        {/* Compliance Disclaimer */}
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
          Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
        </p>
      </div>
      <GuestSignInModal />
      <AppDownloadPopup />
      <TelegramPromoPopup />
    </>
  );
};

export default Index;
