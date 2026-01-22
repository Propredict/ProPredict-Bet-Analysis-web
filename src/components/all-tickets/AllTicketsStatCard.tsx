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
    icon: "text-primary",
  },
  accent: {
    bg: "bg-accent/10",
    icon: "text-accent",
  },
  warning: {
    bg: "bg-warning/10",
    icon: "text-warning",
  },
};

export function AllTicketsStatCard({ icon: Icon, count, label, accentColor }: AllTicketsStatCardProps) {
  const colors = colorClasses[accentColor];

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
