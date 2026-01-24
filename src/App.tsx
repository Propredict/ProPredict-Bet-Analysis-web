import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "@/layouts/AppLayout";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import LiveScores from "./pages/LiveScores";
import MyFavorites from "./pages/MyFavorites";
import AllTickets from "./pages/AllTickets";
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
import NotFound from "./pages/NotFound";

// Tier pages
import DailyTips from "./pages/DailyTips";
import DailyTickets from "./pages/DailyTickets";
import ExclusiveTips from "./pages/ExclusiveTips";
import ExclusiveTickets from "./pages/ExclusiveTickets";
import PremiumTips from "./pages/PremiumTips";
import PremiumTickets from "./pages/PremiumTickets";
import AIPredictions from "./pages/AIPredictions";
import BettingTips from "./pages/BettingTips";
import LeagueStatistics from "./pages/LeagueStatistics";

// Admin
import ManageTips from "./pages/admin/ManageTips";
import ManageTickets from "./pages/admin/ManageTickets";

import ProtectedRoute from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { UserPlanProvider } from "./hooks/useUserPlan";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserPlanProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Login without layout */}
            <Route path="/login" element={<Login />} />

            {/* All other pages with AppLayout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/live-scores" element={<LiveScores />} />
              <Route path="/favorites" element={<MyFavorites />} />
              <Route path="/all-tickets" element={<AllTickets />} />
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
              <Route path="/betting-tips" element={<BettingTips />} />
              <Route path="/league-statistics" element={<LeagueStatistics />} />

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
);

export default App;
