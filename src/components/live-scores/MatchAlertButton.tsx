import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchAlertButtonProps {
  hasAlert: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export function MatchAlertButton({ hasAlert, onClick, disabled }: MatchAlertButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300",
        hasAlert 
          ? "bg-green-500/20 shadow-lg shadow-green-500/30 hover:bg-green-500/30" 
          : "bg-white/5 hover:bg-white/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {hasAlert ? (
        <BellRing className="h-4 w-4 text-green-400 animate-pulse" />
      ) : (
        <Bell className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
