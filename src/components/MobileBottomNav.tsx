import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Zap, BrainCircuit, Crown, ListOrdered, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof Zap;
  path: string;
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "AI Predictions",
    icon: BrainCircuit,
    path: "/ai-predictions",
    matchPaths: ["/ai-predictions"]
  },
  {
    label: "Top 10",
    icon: ListOrdered,
    path: "/match-previews",
    matchPaths: ["/match-previews", "/match-preview/"]
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    matchPaths: ["/"]
  },
  {
    label: "Premium",
    icon: Crown,
    path: "/get-premium",
    matchPaths: ["/get-premium"]
  },
  {
    label: "Live",
    icon: Zap,
    path: "/live-scores",
    matchPaths: ["/live-scores"]
  },
];

export const MobileBottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();

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
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-sidebar/95 text-sidebar-foreground backdrop-blur-lg border-t border-sidebar-border shadow-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1.5 transition-all",
                active
                  ? "text-primary"
                  : "text-sidebar-foreground/65 hover:text-sidebar-foreground"
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
                "text-[10px] font-medium text-center leading-tight",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";
