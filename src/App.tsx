import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppLayout from "@/layouts/AppLayout";
import { ScrollToTop } from "@/components/ScrollToTop";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import LiveScores from "./pages/LiveScores";
import MyFavorites from "./pages/MyFavorites";
import WinningHistory from "./pages/WinningHistory";
import TicketDetails from "./pages/TicketDetails";
import GetPremium from "./pages/GetPremium";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import TermsOfService from "./pages/TermsOfService";
import Disclaimer from "./pages/Disclaimer";
import DataDeletion from "./pages/DataDeletion";
import HelpSupport from "./pages/HelpSupport";
import AboutUs from "./pages/AboutUs";
import HowAIWorks from "./pages/HowAIWorks";
import NotFound from "./pages/NotFound";

// Tier pages
import DailyTips from "./pages/DailyTips";
import DailyTickets from "./pages/DailyTickets";
import ExclusiveTips from "./pages/ExclusiveTips";
import ExclusiveTickets from "./pages/ExclusiveTickets";
import PremiumTips from "./pages/PremiumTips";
import PremiumTickets from "./pages/PremiumTickets";
import AIPredictions from "./pages/AIPredictions";
import AIvsCommunity from "./pages/AIvsCommunity";
import HowAIvsMembersWorks from "./pages/HowAIvsMembersWorks";
import BettingTips from "./pages/BettingTips";
import LeagueStatistics from "./pages/LeagueStatistics";
import MatchPreviews from "./pages/MatchPreviews";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import ManageTips from "./pages/admin/ManageTips";
import ManageTickets from "./pages/admin/ManageTickets";

import ProtectedRoute from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { UserPlanProvider } from "./hooks/useUserPlan";

const queryClient = new QueryClient();

const App = () => {
  // 🔔 OneSignal → Supabase sync
  useEffect(() => {
    if (!window.OneSignal) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      const playerId = await OneSignal.User.PushSubscription.id;

      if (playerId) {
        await supabase.from("users_push_tokens").upsert({
          user_id: user.id,
          onesignal_player_id: playerId,
          platform: "web",
        });
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
              <Routes>
                {/* Auth pages without layout */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* All other pages with AppLayout */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/how-ai-works" element={<HowAIWorks />} />
                  <Route path="/live-scores" element={<LiveScores />} />
                  <Route path="/favorites" element={<MyFavorites />} />
                  <Route path="/winning-history" element={<WinningHistory />} />
                  <Route path="/tickets/:id" element={<TicketDetails />} />
                  <Route path="/get-premium" element={<GetPremium />} />

                  {/* Tips & Tickets */}
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

                  {/* Settings & Legal */}
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/data-deletion" element={<DataDeletion />} />
                  <Route path="/help-support" element={<HelpSupport />} />
                  <Route path="/about-us" element={<AboutUs />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserPlanProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
