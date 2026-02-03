import { useEffect } from "react";
import { 
  LayoutDashboard, 
  Ticket, 
  Calendar,
  Lightbulb,
  Star,
  Crown,
  Sparkles,
  Brain,
  Zap,
  Heart,
  BarChart3,
  Settings,
  AlertTriangle,
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

const tipsAndTickets = [
  { title: "All Tickets", url: "/all-tickets", icon: Ticket },
  { title: "Daily Tips", url: "/daily-tips", icon: Lightbulb },
  { title: "Daily Tickets", url: "/daily-tickets", icon: Calendar },
  { title: "Exclusive Tips", url: "/exclusive-tips", icon: Star },
  { title: "Exclusive Tickets", url: "/exclusive-tickets", icon: Ticket },
  { title: "Premium Tips", url: "/premium-tips", icon: Crown },
  { title: "Premium Tickets", url: "/premium-tickets", icon: Crown },
  { title: "Get Premium", url: "/get-premium", icon: Sparkles, highlight: true },
];

const tools = [
  { title: "AI Predictions", url: "/ai-predictions", icon: Brain },
  { title: "Live Scores", url: "/live-scores", icon: Zap },
  { title: "My Favorites", url: "/favorites", icon: Heart },
  { title: "League Stats", url: "/league-statistics", icon: BarChart3 },
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
      <SidebarHeader className="h-12 sm:h-14 px-3 flex items-center bg-primary">
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
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Tips & Tickets */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase text-muted-foreground px-2 py-1">
            {!collapsed && "Tips & Tickets"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tipsAndTickets.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                        item.highlight 
                          ? "bg-gradient-to-r from-accent to-primary text-white hover:opacity-90" 
                          : "hover:bg-sidebar-accent"
                      }`}
                      activeClassName={item.highlight ? "" : "bg-primary/20 text-primary"}
                    >
                      <item.icon className="h-3.5 w-3.5" />
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
          <SidebarGroupLabel className="text-[9px] uppercase text-muted-foreground px-2 py-1">
            {!collapsed && "Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-primary/20 text-primary"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[9px] uppercase text-muted-foreground px-2 py-1">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-warning/20 text-warning"
                      >
                        <item.icon className="h-3.5 w-3.5" />
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
          <div className="rounded-md bg-accent/10 border border-accent/20 p-1.5 mb-1.5">
            <div className="flex items-center gap-1 text-[9px] text-accent">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>For entertainment only.</span>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink 
                to="/settings" 
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors hover:bg-sidebar-accent"
                activeClassName="bg-primary/20 text-primary"
              >
                <Settings className="h-3.5 w-3.5" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
