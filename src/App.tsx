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
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/live-scores" element={<LiveScores />} />
            <Route path="/favorites" element={<MyFavorites />} />
            <Route path="/all-tickets" element={<AllTickets />} />
            {/* Admin Routes */}
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserPlanProvider>
  </QueryClientProvider>
);

export default App;
