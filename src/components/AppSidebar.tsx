import { useEffect } from "react";
import { 
  LayoutDashboard, 
  Ticket, 
  Calendar,
  Lightbulb,
  Layers,
  Star,
  Crown,
  Sparkles,
  Brain,
  Zap,
  Heart,
  BarChart3,
  Settings,
  AlertTriangle,
  Home,
  HelpCircle,
  Eye,
  Swords,
  BookOpen,
  X,
  User,
  Target,
  Gem,
  Trophy,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import logoImage from "@/assets/logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const tipsItems = [
  { title: "Daily Predictions", url: "/daily-analysis", icon: Lightbulb },
  { title: "Pro Insights", url: "/pro-analysis", icon: Star },
  { title: "Premium Predictions", url: "/premium-analysis", icon: Crown },
  { title: "Risk of the Day", url: "/risk-of-the-day", icon: Target },
  { title: "Diamond Pick", url: "/diamond-pick", icon: Gem },
];

const ticketsItems = [
  { title: "Daily Multi-Match", url: "/daily-predictions", icon: Calendar },
  { title: "Pro Multi-Match", url: "/pro-predictions", icon: Ticket },
  { title: "Premium Multi-Match", url: "/premium-predictions", icon: Crown },
  { title: "Multi Risk Matches", url: "/multi-risk-matches", icon: Target },
];

const packagesItems = [
  { title: "Get Premium", url: "/get-premium", icon: Sparkles, highlight: true },
];

const tools = [
  { title: "AI Predictions", url: "/ai-predictions", icon: Brain },
  { title: "Match Previews", url: "/match-previews", icon: Eye },
  { title: "Live Scores", url: "/live-scores", icon: Zap },
  { title: "My Favorites", url: "/favorites", icon: Heart },
  { title: "League Stats", url: "/league-statistics", icon: BarChart3 },
  { title: "Smart Player Picks", url: "/players", icon: User },
];

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Manage Tips", url: "/admin/tips", icon: Lightbulb },
  { title: "Manage Tickets", url: "/admin/tickets", icon: Ticket },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAdmin } = useAdminAccess();

  // Auto-close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="h-12 sm:h-14 pt-[env(safe-area-inset-top,0px)] px-3 bg-primary">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="ProPredict" 
              className="h-8 w-8 object-contain rounded-lg"
            />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold text-primary-foreground">ProPredict</span>
                <span className="text-xs text-primary-foreground/80">AI Predictions & Analysis</span>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setOpenMobile(false)}
              className="p-1.5 rounded-md text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/" 
                  end 
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary"
                >
                  <Home className="h-4 w-4 text-primary" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/world-cup-2026" 
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary"
                >
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  {!collapsed && <span>World Cup 2026</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/ai-vs-community" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary/20 text-primary"
                >
                  <Swords className="h-4 w-4" />
                  {!collapsed && <span>AI vs Members</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Tips */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
            {!collapsed && "Match Predictions"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tipsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tickets */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
            {!collapsed && "Multi-Match Predictions"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ticketsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Packages */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
            {!collapsed && "Packages"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {packagesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-gradient-to-r from-accent to-primary text-white hover:opacity-90"
                      activeClassName=""
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
            {!collapsed && "Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Learn */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
            {!collapsed && "Learn"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/how-ai-works" 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/20 text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {!collapsed && <span>How AI Works</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/help-support?faq=predictions-glossary" 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/20 text-primary"
                  >
                    <BookOpen className="h-4 w-4" />
                    {!collapsed && <span>Predictions Glossary</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/winning-history" 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/20 text-primary"
                  >
                    <Layers className="h-4 w-4" />
                    {!collapsed && <span>Match History</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground px-3 py-1.5">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-warning/20 text-warning"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        {!collapsed && (
          <div className="rounded-md bg-accent/10 border border-accent/20 p-2 mb-2">
            <div className="flex items-center gap-1.5 text-[10px] text-accent">
              <AlertTriangle className="h-3 w-3" />
              <span>For entertainment only.</span>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink 
                to="/help-support" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-primary/20 text-primary"
              >
                <HelpCircle className="h-4 w-4" />
                {!collapsed && <span>FAQ & Support</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink 
                to="/settings" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-primary/20 text-primary"
              >
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
