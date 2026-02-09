import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function GuestBanner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if loading, user is authenticated, or banner was dismissed
  if (loading || user || isDismissed) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 rounded-lg p-2 sm:p-3 mb-2">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-1.5 right-1.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Dismiss banner"
      >
        <X className="h-3 w-3" />
      </button>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pr-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Unlock Full Access</h3>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Sign in to unlock Daily AI Picks, exclusive predictions, and save your favorites.
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate("/login")}
          className="gap-1 shrink-0 h-6 sm:h-7 text-[10px] sm:text-xs px-2"
          size="sm"
        >
          <LogIn className="h-3 w-3" />
          Sign In
        </Button>
      </div>
    </div>
  );
}
