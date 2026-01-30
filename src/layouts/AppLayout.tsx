import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, BellRing, Heart, User, LogOut, Crown, Star, Gift } from "lucide-react";
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
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { plan } = useUserPlan();
  const { settings: alertSettings, toggleSetting: toggleAlertSetting } = useGlobalAlertSettings();
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);

  const getPlanBadge = () => {
    switch (plan) {
      case "premium":
        return {
          icon: Crown,
          label: "Premium",
          className: "bg-gradient-to-r from-warning/20 to-accent/20 text-warning border-warning/30",
          showUpgrade: false,
          upgradeLabel: "",
        };
      case "basic":
        return {
          icon: Star,
          label: "Pro",
          className: "bg-primary/20 text-primary border-primary/30",
          showUpgrade: true,
          upgradeLabel: "Go Premium",
        };
      default:
        return {
          icon: Gift,
          label: "Free",
          className: "bg-muted text-muted-foreground border-border",
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden max-w-[100vw]">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {/* FIXED Header - Always visible */}
          <header className="fixed top-0 left-0 right-0 z-50 h-10 sm:h-11 border-b border-border flex items-center justify-between px-1.5 sm:px-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-width,0)]">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground flex-shrink-0 h-7 w-7" />
            
            {/* Center Branding with Logo - mobile only */}
            <div className="flex sm:hidden absolute left-1/2 -translate-x-1/2 items-center gap-1.5">
              <img 
                src={logoImage} 
                alt="ProPredict" 
                className="h-6 w-6 object-contain cursor-pointer flex-shrink-0" 
                onClick={() => navigate("/")}
              />
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-foreground tracking-tight">ProPredict</span>
                <span className="text-[8px] text-muted-foreground -mt-0.5">AI Predictions & Analysis</span>
              </div>
            </div>
            
            {/* Desktop Logo - visible on sm+ */}
            <img 
              src={logoImage} 
              alt="ProPredict" 
              className="hidden sm:block h-7 w-7 object-contain cursor-pointer flex-shrink-0 ml-2" 
              onClick={() => navigate("/")}
            />
            
            <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto">
              {/* Subscription Badge */}
              <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity text-[9px] sm:text-[10px]",
                    planBadge.className
                  )}
                  onClick={() => navigate("/get-premium")}
                >
                  <planBadge.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="font-medium">{planBadge.label}</span>
                </Badge>
                {planBadge.showUpgrade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/get-premium")}
                    className="hidden sm:flex text-[10px] text-accent hover:text-accent/80 px-1.5 h-5"
                  >
                    {planBadge.upgradeLabel}
                  </Button>
                )}
              </div>

              {/* Alerts Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowGlobalAlerts(true)}
                className={cn(
                  "relative transition-all h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0",
                  alertSettings.enabled 
                    ? "text-green-400 hover:text-green-300" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {alertSettings.enabled ? (
                  <>
                    <BellRing className="h-3.5 w-3.5" />
                    <span className="absolute top-0 right-0 h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                  </>
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
              </Button>
              
              {/* Favorites Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/favorites")}
                className="text-muted-foreground hover:text-pink-400 transition-colors h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0"
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0"
                    >
                      <User className="h-3.5 w-3.5" />
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
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/login")}
                  className="text-muted-foreground hover:text-foreground h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0"
                >
                  <User className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </header>

          {/* Main Content - scrollable area containing page content and footer */}
          <main className="flex-1 flex flex-col mt-10 sm:mt-11 pb-16 md:pb-0 overflow-y-auto overflow-x-hidden max-w-full">
            <div className="page-content flex-1 overflow-x-hidden">
              <Outlet />
            </div>
            
            {/* Footer - inside scrollable area, visible on all devices */}
            <Footer />
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
