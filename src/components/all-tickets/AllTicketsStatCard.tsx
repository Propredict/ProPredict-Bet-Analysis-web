import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AllTicketsStatCardProps {
  icon: LucideIcon;
  count: number;
  label: string;
  accentColor: "primary" | "accent" | "warning";
}

const colorClasses = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
  },
  accent: {
    bg: "bg-accent/10",
    border: "border-accent/20",
    icon: "text-accent",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/20",
    icon: "text-warning",
  },
};

export function AllTicketsStatCard({ icon: Icon, count, label, accentColor }: AllTicketsStatCardProps) {
  const colors = colorClasses[accentColor];

  return (
    <Card className={cn("p-2.5 sm:p-3 bg-card/80 border-border/50 hover:border-border transition-colors", colors.border)}>
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-md", colors.bg)}>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", colors.icon)} />
        </div>
        <div>
          <p className="text-base sm:text-lg font-bold text-foreground">{count}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
