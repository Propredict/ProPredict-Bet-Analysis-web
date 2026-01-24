import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface KickoffCountdownProps {
  startTime: string; // e.g., "15:30" or "20:45"
  matchDate?: string; // ISO date string if available
}

export function KickoffCountdown({ startTime, matchDate }: KickoffCountdownProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    const calculateCountdown = () => {
      try {
        const now = new Date();
        let kickoff: Date;

        if (matchDate && !isNaN(new Date(matchDate).getTime())) {
          // Use full date if available
          kickoff = new Date(matchDate);
        } else {
          // Parse time string (HH:MM) and assume today
          const [hours, minutes] = startTime.split(":").map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            setCountdown(null);
            return;
          }
          kickoff = new Date();
          kickoff.setHours(hours, minutes, 0, 0);
        }

        const diff = kickoff.getTime() - now.getTime();

        if (diff <= 0) {
          setCountdown(null);
          return;
        }

        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 24) {
          const days = Math.floor(hours / 24);
          setCountdown(`${days}d`);
        } else if (hours > 0) {
          setCountdown(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setCountdown(`${minutes}m`);
        } else {
          setCountdown("Soon");
        }
      } catch {
        setCountdown(null);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60_000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime, matchDate]);

  if (!countdown) {
    return (
      <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">
        {startTime}
      </Badge>
    );
  }

  return (
    <Badge className="bg-primary/10 text-primary border border-primary/30 text-[10px] sm:text-xs px-1 sm:px-2 gap-0.5 sm:gap-1">
      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      {countdown}
    </Badge>
  );
}
