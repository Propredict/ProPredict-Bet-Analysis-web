import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared Stadium Blue page header used across all main pages
 * so the whole app keeps one consistent look.
 */
export function PageHero({ title, subtitle, icon: Icon, badge, actions, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary/80 px-4 py-4 shadow-lg shadow-primary/20 sm:px-6 sm:py-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full border-[26px] border-primary-foreground/10" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/40">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-primary-foreground sm:text-2xl">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-primary-foreground/80 sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default PageHero;
