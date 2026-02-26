import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { Loader2 } from "lucide-react";

/**
 * Android-only auth gate.
 * On Android WebView:
 *   - authLoading → full-screen splash/spinner
 *   - no user     → redirect to /login
 *   - user exists → render children
 *
 * On web: always renders children (guest-friendly).
 */

const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function AndroidAuthGate({ children }: { children: ReactNode }) {
  const isAndroid = getIsAndroidApp();

  // On web, skip the gate entirely
  if (!isAndroid) return <>{children}</>;

  return <AndroidGateInner>{children}</AndroidGateInner>;
}

function AndroidGateInner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Allow auth-related pages to render without redirect loops
  if (AUTH_ROUTES.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Splash while auth is resolving
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img
          src="/icon-192x192.png"
          alt="ProPredict"
          className="h-20 w-20 rounded-2xl shadow-lg"
        />
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
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
