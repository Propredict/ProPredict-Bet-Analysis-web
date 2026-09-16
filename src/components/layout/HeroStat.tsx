import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "live" | "success" | "sky";

interface HeroStatProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}

const TONES: Record<Tone, { card: string; tile: string; label: string }> = {
  default: {
    card: "border-primary/25",
    tile: "bg-primary/10 text-primary",
    label: "text-muted-foreground",
  },
  live: {
    card: "border-primary/40 bg-primary/[0.04]",
    tile: "bg-primary text-primary-foreground",
    label: "text-primary",
  },
  success: {
    card: "border-primary/25",
    tile: "bg-primary/10 text-primary",
    label: "text-muted-foreground",
  },
  sky: {
    card: "border-primary/25 bg-primary/[0.04]",
    tile: "bg-primary/15 text-primary",
    label: "text-muted-foreground",
  },
};

/**
 * Shared Stadium Blue stat card used under the page hero on main pages.
 */
export function HeroStat({ icon: Icon, label, value, caption, tone = "default", onClick, className }: HeroStatProps) {
  const t = TONES[tone];
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 bg-card p-3 shadow-sm transition-colors sm:p-4",
        t.card,
        onClick && "cursor-pointer hover:border-primary",
        className,
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", t.tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={cn("truncate text-[11px] font-bold uppercase tracking-wider", t.label)}>{label}</p>
        <p className="truncate text-xl font-black leading-tight text-sidebar sm:text-2xl">{value}</p>
        {caption && <p className="truncate text-[11px] text-muted-foreground">{caption}</p>}
      </div>
    </div>
  );
}

export default HeroStat;
