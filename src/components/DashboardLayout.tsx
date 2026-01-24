import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Footer } from "@/components/Footer";
import { Bell, BellRing, Heart, User, LogOut, LogIn, Crown, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useGlobalAlertSettings } from "@/hooks/useGlobalAlertSettings";
import { GlobalAlertsModal } from "@/components/live-scores/GlobalAlertsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function DashboardLayout({ children, fullWidth = false }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { plan } = useUserPlan();
  const { settings: alertSettings, toggleSetting: toggleAlertSetting } = useGlobalAlertSettings();
  const [showGlobalAlerts, setShowGlobalAlerts] = useState(false);

  const getPlanBadge = () => {
    switch (plan) {
      case "premium":
        return {
          label: "Premium",
          icon: Crown,
          className: "bg-gradient-to-r from-accent to-primary text-white border-0",
          showUpgrade: false,
        };
      case "basic":
        return {
          label: "Basic",
          icon: Star,
          className: "bg-primary/20 text-primary border-primary/30",
          showUpgrade: true,
          upgradeLabel: "Go Premium",
        };
      default:
        return {
          label: "Free",
          icon: Sparkles,
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
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* FIXED Header - ULTRA COMPACT */}
          <header className="fixed top-0 left-0 right-0 z-50 h-10 sm:h-11 border-b border-border flex items-center justify-between px-1.5 sm:px-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-width,0)]">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground flex-shrink-0 h-7 w-7" />
            
            <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto">
              {/* Subscription Badge - hidden on very small screens */}
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
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/favorites")}
                className="text-muted-foreground hover:text-pink-400 transition-colors h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0"
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>

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
                  variant="default" 
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="gap-0.5 h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs flex-shrink-0"
                >
                  <LogIn className="h-3 w-3" />
                  <span className="hidden xs:inline">Sign In</span>
                </Button>
              )}
            </div>
          </header>

          {/* Main Content - GLOBAL COMPACT DENSITY padding */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 md:py-6 pb-20 md:pb-6 min-w-0 mt-10 sm:mt-11">
            <div className={cn("mx-auto w-full space-y-4 md:space-y-6", !fullWidth && "max-w-[1200px]")}>
              {children}
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      <GlobalAlertsModal
        isOpen={showGlobalAlerts}
        onClose={() => setShowGlobalAlerts(false)}
        settings={alertSettings}
        onToggle={toggleAlertSetting}
      />
    </SidebarProvider>
  );
}
