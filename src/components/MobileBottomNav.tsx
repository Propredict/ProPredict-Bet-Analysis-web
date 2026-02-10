import { useLocation, useNavigate } from "react-router-dom";
import { Zap, Heart, Ticket, User, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof Zap;
  path: string;
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { 
    label: "Live", 
    icon: Zap, 
    path: "/live-scores",
    matchPaths: ["/live-scores"]
  },
  { 
    label: "Favorites", 
    icon: Heart, 
    path: "/favorites",
    matchPaths: ["/favorites"]
  },
  { 
    label: "Members", 
    icon: Swords, 
    path: "/ai-vs-community",
    matchPaths: ["/ai-vs-community"]
  },
  { 
    label: "AI Picks", 
    icon: Ticket, 
    path: "/winning-history",
    matchPaths: ["/winning-history", "/daily-tickets", "/exclusive-tickets", "/premium-tickets", "/daily-tips", "/exclusive-tips", "/premium-tips", "/betting-tips"]
  },
  { 
    label: "Profile", 
    icon: User, 
    path: "/profile",
    matchPaths: ["/profile", "/settings"]
  },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => 
        p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
      );
    }
    return location.pathname === item.path;
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1.5 transition-all",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-6 rounded-full transition-colors",
                active && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110"
                )} />
                {item.label === "Live" && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
