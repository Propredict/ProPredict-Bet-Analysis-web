import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroStatProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  tone?: "default" | "live";
  onClick?: () => void;
  className?: string;
}

/**
 * Shared Stadium Blue stat card used under the page hero on main pages.
 */
export function HeroStat({ icon: Icon, label, value, caption, tone = "default", onClick, className }: HeroStatProps) {
  const isLive = tone === "live";
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 bg-card p-3 shadow-md transition-colors sm:p-4",
        isLive ? "border-success/40 bg-success/5" : "border-primary/30",
        onClick && "cursor-pointer hover:border-primary",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isLive ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[10px] font-bold uppercase tracking-wider",
            isLive ? "text-success" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="truncate text-lg font-black leading-tight text-sidebar sm:text-xl">{value}</p>
        {caption && <p className="truncate text-[11px] text-muted-foreground">{caption}</p>}
      </div>
    </div>
  );
}

export default HeroStat;
