import { useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

/** Redirect that preserves query params (critical for push notification deep links) */
function NavigateWithSearch({ to }: { to: string }) {
  const location = useLocation();
  const [pathname, targetSearch = ""] = to.split("?");
  const params = new URLSearchParams(location.search);
  new URLSearchParams(targetSearch).forEach((value, key) => params.set(key, value));
  const search = params.toString();
  return <Navigate to={`${pathname}${search ? `?${search}` : ""}`} replace />;
}
import AppLayout from "@/layouts/AppLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { PlayerProfileProvider } from "@/contexts/PlayerProfileContext";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";

// Lightweight pages - eager import
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

// Heavy pages - lazy loaded for faster navigation
const Profile = lazy(() => import("./pages/Profile"));
const LiveScores = lazy(() => import("./pages/LiveScores"));
const MyFavorites = lazy(() => import("./pages/MyFavorites"));

const TicketDetails = lazy(() => import("./pages/TicketDetails"));
const GetPremium = lazy(() => import("./pages/GetPremium"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const HowAIWorks = lazy(() => import("./pages/HowAIWorks"));

// Tier pages - lazy loaded
const Tickets = lazy(() => import("./pages/Tickets"));
const PremiumTickets = lazy(() => import("./pages/PremiumTickets"));
const ExclusiveTips = lazy(() => import("./pages/ExclusiveTips"));
const ExclusiveTickets = lazy(() => import("./pages/ExclusiveTickets"));
const SingleTips = lazy(() => import("./pages/SingleTips"));
const AIPredictions = lazy(() => import("./pages/AIPredictions"));
const LeagueStatistics = lazy(() => import("./pages/LeagueStatistics"));
const MatchPreviews = lazy(() => import("./pages/MatchPreviews"));
const LiveChat = lazy(() => import("./pages/LiveChat"));
const MatchPreviewDetail = lazy(() => import("./pages/MatchPreviewDetail"));

const FootballPredictionsToday = lazy(() => import("./pages/FootballPredictionsToday"));

// Admin - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageTips = lazy(() => import("./pages/admin/ManageTips"));
const ManageTickets = lazy(() => import("./pages/admin/ManageTickets"));
const AdminSupportChat = lazy(() => import("./pages/admin/SupportChat"));
const AdminSureOddsAnalytics = lazy(() => import("./pages/admin/SureOddsAnalytics"));

import ProtectedRoute from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { UserPlanProvider } from "./hooks/useUserPlan";
import { AndroidAuthGate } from "./components/AndroidAuthGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 minutes – cached data served instantly on navigation
      gcTime: 10 * 60 * 1000,       // 10 minutes – keep unused data in memory longer
      refetchOnWindowFocus: false,   // Don't refetch when switching tabs (saves data on Android)
      retry: 1,                      // Fewer retries for faster failure feedback
    },
  },
});

function RootEntry() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return user ? <Index /> : <Navigate to="/login" replace />;
}

const App = () => {
  // 🛡️ Global safety net: catch unhandled async errors so UI never silently breaks
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[App] Unhandled promise rejection:", event.reason);
      event.preventDefault(); // Prevent crash
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  // 🔔 OneSignal push click → deep link navigation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async function (OneSignal: any) {
      const handlePushClick = (event: any) => {
        const data = event?.notification?.additionalData;
        const navPath = data?.nav_path;
        if (!navPath) return;
        console.log("[OneSignal] Push click nav_path:", navPath);
        if (window.location.pathname + window.location.search === navPath) return;
        window.history.pushState({}, "", navPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      };

      try {
        OneSignal?.Notifications?.addEventListener?.("click", handlePushClick);
      } catch (e) {
        console.warn("[OneSignal] Could not add click listener:", e);
      }
    });
  }, []);

  // 🔔 OneSignal Web → Supabase sync (SKIP on Android — native bridge handles it)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;
    const isAndroid = typeof w.Android !== 'undefined'
      || w.isAndroidApp === true
      || w.__IS_ANDROID_APP__ === true;
    try { if (w.sessionStorage?.getItem('propredict:platform') === 'android') return; } catch {}
    if (isAndroid) return;

    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async function (OneSignal: any) {
      const syncPlayerId = async () => {
        try {
          const sub = OneSignal?.User?.PushSubscription;
          const playerId = sub?.id;
          if (!playerId) {
            console.log("[OneSignal Web] No player ID yet, skipping sync");
            return;
          }

          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user;
          if (!user) return;

          await supabase.from("users_push_tokens").upsert(
            {
              user_id: user.id,
              onesignal_player_id: playerId,
              platform: "web",
            },
            { onConflict: "user_id,platform" },
          );
          console.log("[OneSignal Web] Player ID synced:", playerId);
        } catch (error) {
          console.error("[OneSignal Web] Sync error:", error);
        }
      };

      await syncPlayerId();

      try {
        OneSignal?.User?.PushSubscription?.addEventListener?.("change", syncPlayerId);
      } catch (e) {
        console.warn("[OneSignal Web] Could not add change listener:", e);
      }
    });
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPlanProvider>
            <TooltipProvider>
              <PlayerProfileProvider>
              <Toaster />
              <Sonner />
              <PlayerProfileModal />
              <BrowserRouter>
                <ScrollToTop />
                <DeepLinkHandler />
                <AndroidAuthGate>
                <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
                <Routes>
                  {/* Auth pages */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />

                  {/* Standalone landing page – no AppLayout */}
                  <Route path="/football-predictions-today" element={<FootballPredictionsToday />} />

                  {/* Layout pages */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<RootEntry />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/how-ai-works" element={<HowAIWorks />} />
                    <Route path="/live-scores" element={<LiveScores />} />
                    <Route path="/favorites" element={<MyFavorites />} />
                    <Route path="/winning-history" element={<Navigate to="/" replace />} />
                    <Route path="/tickets/:id" element={<TicketDetails />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route path="/get-premium" element={<GetPremium />} />

                    {/* Tips */}
                    <Route path="/single-tips" element={<SingleTips />} />
                    <Route path="/daily-analysis" element={<NavigateWithSearch to="/single-tips?view=daily" />} />
                    <Route path="/daily-tips" element={<NavigateWithSearch to="/single-tips?view=daily" />} />
                    <Route path="/daily-predictions" element={<NavigateWithSearch to="/tickets" />} />
                    <Route path="/daily-tickets" element={<NavigateWithSearch to="/tickets" />} />
                    <Route path="/top-picks" element={<ExclusiveTips />} />
                    <Route path="/pro-analysis" element={<NavigateWithSearch to="/top-picks" />} />
                    <Route path="/exclusive-tips" element={<NavigateWithSearch to="/top-picks" />} />
                    <Route path="/sure-odds" element={<ExclusiveTickets />} />
                    <Route path="/pro-predictions" element={<NavigateWithSearch to="/sure-odds" />} />
                    <Route path="/exclusive-tickets" element={<NavigateWithSearch to="/sure-odds" />} />
                    <Route path="/premium-analysis" element={<NavigateWithSearch to="/single-tips?view=premium" />} />
                    <Route path="/premium-tips" element={<NavigateWithSearch to="/single-tips?view=premium" />} />
                    <Route path="/premium-predictions" element={<NavigateWithSearch to="/premium-tickets" />} />
                    <Route path="/premium-tickets" element={<PremiumTickets />} />
                    <Route path="/ai-predictions" element={<AIPredictions />} />
                    <Route path="/league-statistics" element={<LeagueStatistics />} />
                    <Route path="/match-previews" element={<MatchPreviews />} />
                    <Route path="/match-preview/:matchId" element={<MatchPreviewDetail />} />
                    <Route path="/risk-of-the-day" element={<NavigateWithSearch to="/single-tips?view=risk" />} />
                    <Route path="/diamond-pick" element={<NavigateWithSearch to="/single-tips?view=diamond" />} />
                    

                    {/* Protected */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin */}
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/tips"
                      element={
                        <AdminRoute>
                          <ManageTips />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/tickets"
                      element={
                        <AdminRoute>
                          <ManageTickets />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/sure-odds-analytics"
                      element={
                        <AdminRoute>
                          <AdminSureOddsAnalytics />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/admin/support"
                      element={
                        <AdminRoute>
                          <AdminSupportChat />
                        </AdminRoute>
                      }
                    />

                    {/* Legal */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/cookie-policy" element={<CookiePolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/disclaimer" element={<Disclaimer />} />
                    <Route path="/data-deletion" element={<DataDeletion />} />
                    <Route path="/help-support" element={<HelpSupport />} />
                    <Route path="/live-chat" element={<LiveChat />} />
                    <Route path="/about-us" element={<AboutUs />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                </AndroidAuthGate>
              </BrowserRouter>
              </PlayerProfileProvider>
            </TooltipProvider>
          </UserPlanProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
