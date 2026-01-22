import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import LiveScores from "./pages/LiveScores";
import MyFavorites from "./pages/MyFavorites";
import AllTickets from "./pages/AllTickets";
import TicketDetails from "./pages/TicketDetails";
import GetPremium from "./pages/GetPremium";
import NotFound from "./pages/NotFound";

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
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/live-scores" element={<LiveScores />} />
            <Route path="/favorites" element={<MyFavorites />} />
            <Route path="/all-tickets" element={<AllTickets />} />
            <Route path="/get-premium" element={<GetPremium />} />

            {/* Ticket Details */}
            <Route path="/tickets/:id" element={<TicketDetails />} />

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

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserPlanProvider>
  </QueryClientProvider>
);

export default App;
