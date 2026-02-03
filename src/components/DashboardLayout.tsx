import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Footer } from "@/components/Footer";
import { Bell, BellRing, Star, User, LogOut, Crown, Sparkles } from "lucide-react";
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
          className: "bg-[#F5C451]/20 text-[#F5C451] border-[#F5C451]/40",
          showUpgrade: false,
        };
      case "basic":
        return {
          label: "Pro",
          icon: Star,
          className: "bg-[#2FBF9B]/20 text-[#2FBF9B] border-[#2FBF9B]/40",
          showUpgrade: true,
          upgradeLabel: "Go Premium",
        };
      default:
        return {
          label: "Free",
          icon: Sparkles,
          className: "bg-[#6B7280]/20 text-[#6B7280] border-[#6B7280]/40",
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
          <header className="fixed top-0 left-0 right-0 z-50 h-10 sm:h-11 border-b border-primary/30 flex items-center justify-between px-1.5 sm:px-3 bg-primary md:left-[var(--sidebar-width,0)]">
            <SidebarTrigger className="text-primary-foreground hover:text-primary-foreground/80 flex-shrink-0 h-7 w-7" />
            
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

              {/* Notifications Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowGlobalAlerts(true)}
                className={cn(
                  "gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs border-primary-foreground/30 bg-transparent hover:bg-primary-foreground/10",
                  alertSettings.enabled 
                    ? "text-primary-foreground" 
                    : "text-primary-foreground/80"
                )}
              >
                {alertSettings.enabled ? (
                  <BellRing className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                <span>Notifications</span>
              </Button>
              
              {/* Favourites Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/favorites")}
                className="gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Star className="h-3.5 w-3.5" />
                <span>Favourites</span>
              </Button>

              {/* Login/User Button */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Account</span>
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
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Login</span>
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
