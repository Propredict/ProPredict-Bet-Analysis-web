import { useState, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "guest_modal_shown";

export const GuestSignInModal = forwardRef<HTMLDivElement>((_, ref) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Only show for guests who haven't seen the modal this session
    if (!user && !sessionStorage.getItem(STORAGE_KEY)) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleSignIn = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    navigate("/login");
  };

  const handleContinueAsGuest = () => {
    handleClose();
  };

  // Don't render if logged in or loading
  if (loading || user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        ref={ref}
        className="bg-white text-gray-900 border-0 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-0 max-w-[340px] sm:max-w-[380px] animate-in fade-in-0 duration-300"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-8">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 text-center leading-snug mb-6">
            Sign In and get FREE access to AI predictions
          </DialogTitle>

          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
            >
              Sign in
            </Button>

            <button
              onClick={handleContinueAsGuest}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

GuestSignInModal.displayName = "GuestSignInModal";
