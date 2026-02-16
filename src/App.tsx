import { useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppLayout from "@/layouts/AppLayout";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lightweight pages - eager import
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy loaded for faster navigation
const Profile = lazy(() => import("./pages/Profile"));
const LiveScores = lazy(() => import("./pages/LiveScores"));
const MyFavorites = lazy(() => import("./pages/MyFavorites"));
const WinningHistory = lazy(() => import("./pages/WinningHistory"));
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
const DailyTips = lazy(() => import("./pages/DailyTips"));
const DailyTickets = lazy(() => import("./pages/DailyTickets"));
const ExclusiveTips = lazy(() => import("./pages/ExclusiveTips"));
const ExclusiveTickets = lazy(() => import("./pages/ExclusiveTickets"));
const PremiumTips = lazy(() => import("./pages/PremiumTips"));
const PremiumTickets = lazy(() => import("./pages/PremiumTickets"));
const AIPredictions = lazy(() => import("./pages/AIPredictions"));
const AIvsCommunity = lazy(() => import("./pages/AIvsCommunity"));
const HowAIvsMembersWorks = lazy(() => import("./pages/HowAIvsMembersWorks"));
const BettingTips = lazy(() => import("./pages/BettingTips"));
const LeagueStatistics = lazy(() => import("./pages/LeagueStatistics"));
const MatchPreviews = lazy(() => import("./pages/MatchPreviews"));

// Admin - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageTips = lazy(() => import("./pages/admin/ManageTips"));
const ManageTickets = lazy(() => import("./pages/admin/ManageTickets"));

import ProtectedRoute from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { UserPlanProvider } from "./hooks/useUserPlan";

const queryClient = new QueryClient();

const App = () => {
  // 🔔 OneSignal push click → deep link navigation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async function (OneSignal: any) {
      const handlePushClick = (event: any) => {
        const data = event?.notification?.additionalData;
        if (!data?.deep_link) return;
        console.log("[OneSignal] Push click deep_link:", data.deep_link);
        window.location.href = data.deep_link;
      };

      try {
        OneSignal?.Notifications?.addEventListener?.("click", handlePushClick);
      } catch (e) {
        console.warn("[OneSignal] Could not add click listener:", e);
      }
    });
  }, []);

  // 🔔 OneSignal → Supabase sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async function (OneSignal: any) {
      const syncPlayerId = async () => {
        try {
          // SDK v16: use PushSubscription.id (NOT getUserId)
          const sub = OneSignal?.User?.PushSubscription;
          const playerId = sub?.id;
          if (!playerId) {
            console.log("[OneSignal Web] No player ID yet, skipping sync");
            return;
          }

          const { data } = await supabase.auth.getUser();
          const user = data.user;
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

      // Try immediately (if permission already granted)
      await syncPlayerId();

      // Listen for future subscription changes (user grants permission later)
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
        <UserPlanProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
              <Routes>
                {/* Auth pages */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Layout pages */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/how-ai-works" element={<HowAIWorks />} />
                  <Route path="/live-scores" element={<LiveScores />} />
                  <Route path="/favorites" element={<MyFavorites />} />
                  <Route path="/winning-history" element={<WinningHistory />} />
                  <Route path="/tickets/:id" element={<TicketDetails />} />
                  <Route path="/get-premium" element={<GetPremium />} />

                  {/* Tips */}
                  <Route path="/daily-tips" element={<DailyTips />} />
                  <Route path="/daily-tickets" element={<DailyTickets />} />
                  <Route path="/exclusive-tips" element={<ExclusiveTips />} />
                  <Route path="/exclusive-tickets" element={<ExclusiveTickets />} />
                  <Route path="/premium-tips" element={<PremiumTips />} />
                  <Route path="/premium-tickets" element={<PremiumTickets />} />
                  <Route path="/ai-predictions" element={<AIPredictions />} />
                  <Route path="/ai-vs-community" element={<AIvsCommunity />} />
                  <Route path="/how-ai-vs-members-works" element={<HowAIvsMembersWorks />} />
                  <Route path="/betting-tips" element={<BettingTips />} />
                  <Route path="/league-statistics" element={<LeagueStatistics />} />
                  <Route path="/match-previews" element={<MatchPreviews />} />

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

                  {/* Legal */}
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/data-deletion" element={<DataDeletion />} />
                  <Route path="/help-support" element={<HelpSupport />} />
                  <Route path="/about-us" element={<AboutUs />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </UserPlanProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
