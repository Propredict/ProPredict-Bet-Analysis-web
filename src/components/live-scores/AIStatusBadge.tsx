import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIStatusBadgeProps {
  status: "on_track" | "under_pressure" | null;
}

export function AIStatusBadge({ status }: AIStatusBadgeProps) {
  if (!status) return null;

  const isOnTrack = status === "on_track";

  return (
    <Badge
      className={cn(
        "text-[10px] px-1.5 py-0.5 gap-1 font-medium",
        isOnTrack
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
      )}
    >
      <Brain className="h-3 w-3" />
      {isOnTrack ? "On track" : "Under pressure"}
    </Badge>
  );
}
