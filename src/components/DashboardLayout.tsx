import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            
            <div className="flex items-center gap-3">
              {/* Subscription Badge */}
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-1.5 px-2.5 py-1 cursor-pointer hover:opacity-80 transition-opacity ${planBadge.className}`}
                  onClick={() => navigate("/get-premium")}
                >
                  <planBadge.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{planBadge.label}</span>
                </Badge>
                {planBadge.showUpgrade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/get-premium")}
                    className="text-xs text-accent hover:text-accent/80 px-2 h-7"
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
                  "relative transition-all",
                  alertSettings.enabled 
                    ? "text-green-400 hover:text-green-300" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {alertSettings.enabled ? (
                  <>
                    <BellRing className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/favorites")}
                className="text-muted-foreground hover:text-pink-400 transition-colors"
              >
                <Heart className="h-5 w-5" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
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
