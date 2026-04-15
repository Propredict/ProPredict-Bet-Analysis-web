import { Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLockOverlayProps {
  message: string;
  buttonText?: string;
  compact?: boolean;
}

const openPlayStore = () => {
  if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
    (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=me.propredict.app");
  } else {
    window.open("https://play.google.com/store/apps/details?id=me.propredict.app", "_blank");
  }
};

export default function AppLockOverlay({ message, buttonText = "Open App to Unlock", compact = false }: AppLockOverlayProps) {
  return (
    <div className="relative rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-4 px-3" : "py-6 px-4"}`}>
        <div className="p-2 rounded-full bg-primary/10 mb-2">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground mb-3 max-w-[260px]">{message}</p>
        <Button size="sm" onClick={openPlayStore} className="bg-primary text-primary-foreground text-xs gap-1.5">
          <Smartphone className="h-3.5 w-3.5" />
          {buttonText}
        </Button>
        <p className="text-[9px] text-muted-foreground/60 mt-2">Free predictions + live tracking in app</p>
      </div>
    </div>
  );
}
