import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import heroStadium from "@/assets/hero-stadium-player.jpg";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Hide the handwritten "More Than Just Predictions" script */
  hideScript?: boolean;
}

/**
 * Shared Stadium Blue page header used across all main pages
 * so the whole app keeps one consistent look.
 */
export function PageHero({ title, subtitle, icon: Icon, badge, actions, className, hideScript }: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-sidebar px-4 py-5 shadow-lg shadow-primary/20 sm:px-6 sm:py-6",
        className,
      )}
    >
      {/* Stadium photo backdrop */}
      <img
        src={heroStadium}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/35" />
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full border-[26px] border-primary-foreground/10" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/40">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-primary-foreground sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-primary-foreground/85 sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {!hideScript && (
            <p className="hidden select-none font-serif text-lg italic leading-tight text-primary-foreground/90 lg:block xl:text-xl">
              More
              <br />
              Than Just
              <br />
              Predictions
            </p>
          )}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export default PageHero;
