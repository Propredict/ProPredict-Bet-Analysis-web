import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AllTicketsStatCardProps {
  icon: LucideIcon;
  count: number;
  label: string;
  accentColor?: "primary" | "accent" | "warning"; // kept for backwards compatibility but not used
}

export function AllTicketsStatCard({ icon: Icon, count, label }: AllTicketsStatCardProps) {
  return (
    <Card className="p-2.5 sm:p-3 bg-card/80 border-primary/20 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <div>
          <p className="text-base sm:text-lg font-bold text-foreground">{count}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
