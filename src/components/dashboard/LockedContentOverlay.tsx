import { Lock, Play, Star, Crown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type UnlockMethod } from "@/hooks/useUserPlan";

interface LockedContentOverlayProps {
  unlockMethod: UnlockMethod;
  onUnlockClick: () => void;
  className?: string;
  compact?: boolean;
}

export function LockedContentOverlay({ 
  unlockMethod, 
  onUnlockClick, 
  className,
  compact = false 
}: LockedContentOverlayProps) {
  if (unlockMethod.type === "unlocked") {
    return null;
  }

  const getIcon = () => {
    switch (unlockMethod.type) {
      case "watch_ad":
        return Play;
      case "upgrade_basic":
        return Star;
      case "upgrade_premium":
        return Crown;
      case "login_required":
        return LogIn;
      default:
        return Lock;
    }
  };

  const getButtonVariant = () => {
    switch (unlockMethod.type) {
      case "watch_ad":
        return "outline";
      case "upgrade_basic":
        return "default";
      case "upgrade_premium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getButtonClassName = () => {
    if (unlockMethod.type === "watch_ad") {
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
    }
    return "";
  };

  const getMessage = (): string => {
    return unlockMethod.message;
  };

  const Icon = getIcon();

  if (compact) {
    return (
      <Button
        variant={getButtonVariant()}
        size="sm"
        className={cn("gap-2", getButtonClassName(), className)}
        onClick={onUnlockClick}
      >
        <Icon className="h-4 w-4" />
        {getMessage()}
      </Button>
    );
  }

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg z-10",
      className
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-5 w-5" />
        <span className="text-sm font-medium">Content Locked</span>
      </div>
      <Button
        variant={getButtonVariant()}
        className={cn("gap-2", getButtonClassName())}
        onClick={onUnlockClick}
      >
        <Icon className="h-4 w-4" />
        {getMessage()}
      </Button>
    </div>
  );
}
