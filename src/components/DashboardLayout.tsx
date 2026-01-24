import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
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
          {/* STICKY Header - compact on mobile */}
          <header className="sticky top-0 z-50 h-12 sm:h-14 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground flex-shrink-0" />
            
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {/* Subscription Badge - hidden on very small screens */}
              <div className="hidden xs:flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1 px-1.5 sm:px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity text-[10px] sm:text-xs",
                    planBadge.className
                  )}
                  onClick={() => navigate("/get-premium")}
                >
                  <planBadge.icon className="h-3 w-3" />
                  <span className="font-medium">{planBadge.label}</span>
                </Badge>
                {planBadge.showUpgrade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/get-premium")}
                    className="hidden sm:flex text-xs text-accent hover:text-accent/80 px-2 h-6"
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
                  "relative transition-all h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0",
                  alertSettings.enabled 
                    ? "text-green-400 hover:text-green-300" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {alertSettings.enabled ? (
                  <>
                    <BellRing className="h-4 w-4" />
                    <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  </>
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/favorites")}
                className="text-muted-foreground hover:text-pink-400 transition-colors h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
              >
                <Heart className="h-4 w-4" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border-border z-[60]">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs flex-shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Sign In</span>
                </Button>
              )}
            </div>
          </header>

          {/* Main Content - add bottom padding for mobile nav */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-4 md:p-6 pb-20 md:pb-6 min-w-0">
            <div className="max-w-[1280px] mx-auto w-full">
              {children}
            </div>
          </main>
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
