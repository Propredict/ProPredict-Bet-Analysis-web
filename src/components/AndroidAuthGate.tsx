import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Android-only auth gate.
 * On Android WebView:
 *   - First launch → age verification disclaimer
 *   - authLoading → full-screen splash/spinner (max 3s)
 *   - no user     → redirect to /login
 *   - user exists → render children
 *
 * On web: always renders children (guest-friendly).
 */

const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];
const AGE_VERIFIED_KEY = "propredict:age_verified";

function AgeVerificationScreen({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-6">
      <img
        src="/icon-192x192.png"
        alt="ProPredict"
        className="h-20 w-20 rounded-2xl shadow-lg"
      />
      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-lg font-bold text-foreground">Welcome to ProPredict</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          AI-powered sports analysis platform for entertainment and informational purposes only.
        </p>
      </div>

      {/* Age & Disclaimer Box */}
      <div className="w-full max-w-sm rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-xs font-semibold text-foreground">Age Verification & Disclaimer</p>
        </div>
        <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
          <li>• You must be <span className="text-foreground font-medium">18 years or older</span> to use this app.</li>
          <li>• All AI predictions are for <span className="text-foreground font-medium">entertainment purposes only</span>.</li>
          <li>• ProPredict does <span className="text-foreground font-medium">not</span> offer gambling or real-money services.</li>
          <li>• Predictions do not guarantee accuracy of any kind.</li>
        </ul>
      </div>

      {/* Entertainment Banner */}
      <div className="w-full max-w-sm rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
          🎯 For Entertainment & Informational Purposes Only
        </p>
      </div>

      <Button
        onClick={onConfirm}
        className="w-full max-w-sm h-11 text-sm font-semibold"
      >
        I am 18+ · I Understand & Continue
      </Button>

      <p className="text-[9px] text-muted-foreground/60 text-center max-w-xs">
        By continuing, you confirm that you are at least 18 years old and agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

export function AndroidAuthGate({ children }: { children: ReactNode }) {
  const isAndroid = getIsAndroidApp();

  // On web, skip the gate entirely
  if (!isAndroid) return <>{children}</>;

  return <AndroidGateInner>{children}</AndroidGateInner>;
}

function AndroidGateInner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Age verification state
  const [ageVerified, setAgeVerified] = useState(() => {
    try {
      return localStorage.getItem(AGE_VERIFIED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleAgeConfirm = () => {
    try {
      localStorage.setItem(AGE_VERIFIED_KEY, "true");
    } catch { /* ignore */ }
    setAgeVerified(true);
  };

  // Safety: never show splash for more than 3 seconds
  useEffect(() => {
    if (loading && !timedOut) {
      timerRef.current = setTimeout(() => setTimedOut(true), 3000);
    }
    return () => clearTimeout(timerRef.current);
  }, [loading, timedOut]);

  // Allow auth-related pages to render without redirect loops
  if (AUTH_ROUTES.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Show age verification on first launch
  if (!ageVerified) {
    return <AgeVerificationScreen onConfirm={handleAgeConfirm} />;
  }

  // Splash while auth is resolving (max 3s)
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img
          src="/icon-192x192.png"
          alt="ProPredict"
          className="h-20 w-20 rounded-2xl shadow-lg"
        />
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-[9px] text-muted-foreground/50">For entertainment purposes only</p>
      </div>
    );
  }

  // Not authenticated → send to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Authenticated → render app
  return <>{children}</>;
}
