import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bell, BellRing, Star, User, LogOut, Crown, Sparkles } from "lucide-react";
import { ArenaNotificationsDropdown } from "@/components/ArenaNotificationsDropdown";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { GlobalAlertsModal } from "@/components/live-scores/GlobalAlertsModal";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import logoImage from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useGlobalAlertSettings } from "@/hooks/useGlobalAlertSettings";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { initOneSignalWeb } from "@/lib/onesignal";
import { useOneSignalPlayerSync } from "@/hooks/useOneSignalPlayerSync";

// Pages where footer should be hidden (header-only layout)
const HEADER_ONLY_ROUTES = ["/live-scores", "/ai-predictions"];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { plan } = useUserPlan();
  const { settings: alertSettings, toggleSetting: toggleAlertSetting } = useGlobalAlertSettings();
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);

  // Sync Android OneSignal Player ID to Supabase
  useOneSignalPlayerSync();

  // In-app realtime toast notifications for new tips/tickets
  useRealtimeNotifications();

  // Initialize OneSignal Web Push (once)
  useEffect(() => {
    initOneSignalWeb();
  }, []);

  // Fetch user profile for welcome message
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get display name for welcome message
  const getDisplayName = () => {
    if (!user) return null;
    if (profile?.full_name) return profile.full_name.split(" ")[0]; // First name only
    if (profile?.username) return profile.username;
    if (user.email) return user.email.split("@")[0]; // Fallback to email prefix
    return "User";
  };

  const displayName = getDisplayName();
  const hideFooter = HEADER_ONLY_ROUTES.some(route => location.pathname.startsWith(route));

  const getPlanBadge = () => {
    switch (plan) {
      case "premium":
        return {
          icon: Crown,
          label: "Premium",
          className: "bg-fuchsia-500/30 text-fuchsia-300 border-fuchsia-400/60 font-semibold shadow-[0_0_8px_rgba(217,70,239,0.4)]",
          showUpgrade: false,
          upgradeLabel: "",
        };
      case "basic":
        return {
          icon: Star,
          label: "Pro",
          className: "bg-amber-500/30 text-amber-300 border-amber-400/60 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.4)]",
          showUpgrade: true,
          upgradeLabel: "Go Premium",
        };
      default:
        return {
          icon: Sparkles,
          label: "Free",
          className: "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/40",
          showUpgrade: true,
          upgradeLabel: "Upgrade",
        };
    }
  };

  const planBadge = getPlanBadge();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider defaultOpen={true} open={true}>
      <div className="min-h-screen flex w-full overflow-x-hidden max-w-[100vw]">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {/* FIXED Header - Always visible */}
          <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] h-[calc(3rem+env(safe-area-inset-top,0px))] sm:h-[calc(3.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between px-2 sm:px-4 bg-primary md:left-[var(--sidebar-width,0)]">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden text-primary-foreground hover:text-primary-foreground/80 flex-shrink-0 h-8 w-8 [&>svg]:h-5 [&>svg]:w-5" />
              
              {/* Mobile Branding - Text */}
              <div 
                className="flex sm:hidden flex-col cursor-pointer" 
                onClick={() => navigate("/")}
              >
                <span className="text-xs font-bold text-primary-foreground leading-tight">ProPredict</span>
                <span className="text-[8px] font-semibold text-primary-foreground/80 leading-tight">AI Predictions & Analysis</span>
              </div>
              
              {/* Tablet Logo - hidden on mobile and desktop */}
              <img 
                src={logoImage} 
                alt="ProPredict" 
                className="hidden sm:block md:hidden h-7 w-7 object-contain cursor-pointer flex-shrink-0" 
                onClick={() => navigate("/")}
              />
            </div>

            {/* Desktop Center Welcome Text */}
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center">
              <span className="text-sm font-semibold text-primary-foreground">
                {user && displayName ? `Welcome, ${displayName}` : "Welcome to ProPredict"}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              {/* Subscription Badge */}
              <Badge 
                variant="outline" 
                className={cn(
                  "flex items-center gap-1 px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity text-[10px] sm:text-xs border",
                  planBadge.className
                )}
                onClick={() => navigate("/get-premium")}
              >
                <planBadge.icon className="h-3 w-3" />
                <span className="font-medium">{planBadge.label}</span>
              </Badge>

              {/* Arena Notifications Bell */}
              <ArenaNotificationsDropdown />

              {/* Match Alert Notifications Button */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowGlobalAlerts(true)}
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5 border-primary-foreground/30 bg-transparent hover:bg-primary-foreground/10",
                  alertSettings.enabled 
                    ? "text-primary-foreground" 
                    : "text-primary-foreground/80"
                )}
              >
                {alertSettings.enabled ? (
                  <BellRing className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-xs">Alerts</span>
              </Button>
              
              {/* Favourites Button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/favorites")}
                className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Favourites</span>
              </Button>

              {/* Login/User Button */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-popover border-border z-[60]">
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="text-xs">
                      <User className="mr-1.5 h-3 w-3" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive text-xs">
                      <LogOut className="mr-1.5 h-3 w-3" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigate("/login")}
                  className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Login</span>
                </Button>
              )}
            </div>
          </header>

          {/* Main Content - scrollable area containing page content and footer */}
          <main className="flex-1 flex flex-col mt-[calc(3rem+env(safe-area-inset-top,0px))] sm:mt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-16 md:pb-0 overflow-y-auto overflow-x-hidden max-w-full">
            <div className="page-content flex-1 overflow-x-hidden">
              <Outlet />
            </div>
            
            {/* Footer - inside scrollable area, hidden on Live Scores and AI Predictions */}
            {!hideFooter && <Footer />}
          </main>

          {/* Mobile Bottom Navigation - Fixed at bottom */}
          <MobileBottomNav />
          
          {/* Scroll to Top Button */}
          <ScrollToTopButton />
        </SidebarInset>
      </div>

      {/* Global Alerts Modal */}
      <GlobalAlertsModal 
        isOpen={showGlobalAlerts} 
        onClose={() => setShowGlobalAlerts(false)}
        settings={alertSettings}
        onToggle={toggleAlertSetting}
      />
    </SidebarProvider>
  );
}
