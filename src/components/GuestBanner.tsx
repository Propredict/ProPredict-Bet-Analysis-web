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
    <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 rounded-lg p-4 mb-6">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/20 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-8">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Unlock Full Access</h3>
            <p className="text-sm text-muted-foreground">
              Sign in to unlock daily tips, exclusive predictions, and save your favorites.
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => navigate("/login")}
          className="gap-2 shrink-0"
          size="sm"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
      </div>
    </div>
  );
}
