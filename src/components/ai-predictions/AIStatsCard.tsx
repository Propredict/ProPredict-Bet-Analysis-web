import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AIStatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconClassName?: string;
  trend?: "up" | "down" | "neutral";
}

export function AIStatsCard({ icon: Icon, value, label, iconClassName }: AIStatsCardProps) {
  return (
    <Card className="p-4 bg-card border-border hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl bg-muted", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
