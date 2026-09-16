import { useEffect } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { 
  LayoutDashboard, 
  Ticket, 
  Lightbulb,
  
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
  MessageCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminSupportUnread } from "@/hooks/useAdminSupportUnread";
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

const mainItems = [
  { title: "Free Tips", url: "/single-tips", icon: Lightbulb },
  { title: "Tiket / Bet Slip", url: "/tickets", icon: Ticket },
];

const packagesItems = [
  { title: "Get Premium", url: "/get-premium", icon: Sparkles, highlight: true },
];

const premiumItems = [
  { title: "Premium Ticket", url: "/premium-tickets", icon: Ticket },
  { title: "Premium Tips", url: "/single-tips?view=premium", icon: Crown },
  { title: "Diamond Tips", url: "/single-tips?view=diamond", icon: Sparkles },
  { title: "Risk of the Day", url: "/single-tips?view=risk", icon: AlertTriangle },
];

const tools = [
  { title: "AI vs Members", url: "/ai-vs-community", icon: Swords },
  { title: "Live Scores", url: "/live-scores", icon: Zap },
  { title: "My Favorites", url: "/favorites", icon: Heart },
  { title: "League Stats", url: "/league-statistics", icon: BarChart3 },
];

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Manage Tips", url: "/admin/tips", icon: Lightbulb },
  { title: "Manage Tickets", url: "/admin/tickets", icon: Ticket },
  { title: "Sure Odds Tracking", url: "/admin/sure-odds-analytics", icon: Target },
  { title: "Support Inbox", url: "/admin/support", icon: MessageCircle },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAdmin } = useAdminAccess();
  const supportUnread = useAdminSupportUnread();

  // Auto-close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-r border-sidebar-border shadow-xl">
      <SidebarHeader className="h-16 sm:h-[72px] pt-[env(safe-area-inset-top,0px)] px-3 bg-sidebar border-b border-sidebar-border justify-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <img 
              src={logoImage} 
              alt="ProPredict" 
              className="h-10 w-10 object-contain rounded-lg"
            />
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tight text-sidebar-foreground">
                  Pro<span className="text-primary">Predict</span>
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
                  Play Smart. Bet Better.
                </span>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setOpenMobile(false)}
              className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5 bg-sidebar text-sidebar-foreground">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/" 
                  end 
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent"
                   activeClassName="bg-primary text-primary-foreground hover:bg-primary shadow-md"
                >
                   <Home className="h-[18px] w-[18px]" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/sure-odds" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary/20 text-primary"
                >
                  <Ticket className="h-[18px] w-[18px]" />
                  {!collapsed && <span>Sure Odds 2+</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/ai-predictions" 
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <Brain className="h-[18px] w-[18px]" />
                      {!collapsed && <span>AI Predictions</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/match-previews" 
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <Eye className="h-[18px] w-[18px]" />
                      {!collapsed && <span>Top 30 AI Picks</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

          </SidebarMenu>
        </SidebarGroup>

        {/* Single Tips + Tiket / Bet Slip */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
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
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80 px-3 py-1.5">
            {!collapsed && "Premium"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {packagesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-base font-bold transition-colors bg-gradient-to-r from-primary to-primary/75 text-primary-foreground hover:opacity-90 shadow-md"
                      activeClassName=""
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {premiumItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
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
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
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
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/20 text-primary"
                  >
                    <HelpCircle className="h-[18px] w-[18px]" />
                    {!collapsed && <span>How AI Works</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/help-support?faq=predictions-glossary" 
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/20 text-primary"
                  >
                    <BookOpen className="h-[18px] w-[18px]" />
                    {!collapsed && <span>FAQ</span>}
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
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-warning/20 text-warning"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        {!collapsed && <span>{item.title}</span>}
                        {item.url === "/admin/support" && supportUnread > 0 && (
                          <span className={`ml-auto h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse ${collapsed ? "absolute top-0 right-0" : ""}`}>
                            {supportUnread > 9 ? "9+" : supportUnread}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border bg-sidebar text-sidebar-foreground">
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
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-primary/20 text-primary"
              >
                <HelpCircle className="h-[18px] w-[18px]" />
                {!collapsed && <span>FAQ & Support</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink 
                to="/settings" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-primary/20 text-primary"
              >
                <Settings className="h-[18px] w-[18px]" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
