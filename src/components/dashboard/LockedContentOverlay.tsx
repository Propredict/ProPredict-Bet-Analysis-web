import { Lock, Play, Star, Crown, LogIn, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type UnlockMethod } from "@/hooks/useUserPlan";

interface LockedContentOverlayProps {
  unlockMethod: UnlockMethod;
  onUnlockClick: () => void;
  onSecondaryClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function LockedContentOverlay({ 
  unlockMethod, 
  onUnlockClick, 
  onSecondaryClick,
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
      case "android_watch_ad_or_pro":
        return Play;
      case "android_premium_only":
        return Crown;
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
      case "android_watch_ad_or_pro":
        return "outline";
      case "android_premium_only":
        return "default";
      default:
        return "secondary";
    }
  };

  const getButtonClassName = () => {
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") {
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_premium" || unlockMethod.type === "android_premium_only") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
    }
    return "";
  };

  const getMessage = (): string => {
    if (unlockMethod.type === "android_watch_ad_or_pro") {
      return unlockMethod.primaryMessage;
    }
    if (unlockMethod.type === "android_premium_only") {
      return unlockMethod.message;
    }
    return unlockMethod.message;
  };

  const Icon = getIcon();

  // Android dual-button layout for exclusive content (Watch Ad + Buy Pro)
  if (unlockMethod.type === "android_watch_ad_or_pro") {
    if (compact) {
      return (
        <div className={cn("flex flex-col gap-1.5", className)}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-white border-0"
            onClick={onUnlockClick}
          >
            <Play className="h-4 w-4" />
            {unlockMethod.primaryMessage}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={onSecondaryClick}
          >
            <ShoppingCart className="h-3 w-3" />
            {unlockMethod.secondaryMessage}
          </Button>
        </div>
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
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 bg-primary hover:bg-primary/90 text-white border-0"
            onClick={onUnlockClick}
          >
            <Play className="h-4 w-4" />
            {unlockMethod.primaryMessage}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={onSecondaryClick}
          >
            <ShoppingCart className="h-3 w-3" />
            {unlockMethod.secondaryMessage}
          </Button>
        </div>
      </div>
    );
  }

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
