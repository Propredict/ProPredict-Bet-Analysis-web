import { createContext, useContext, useState, useCallback } from "react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { hasWebConfirmation, confirmWebUsage } from "@/hooks/useWebGate";
import { useAuth } from "@/hooks/useAuth";

interface WebGateContextValue {
  confirmAndEnter: () => void;
}
const WebGateContext = createContext<WebGateContextValue | undefined>(undefined);

export function useWebGate() {
  const ctx = useContext(WebGateContext);
  if (!ctx) throw new Error("useWebGate must be used inside HomeGate");
  return ctx;
}

/**
 * Gate component:
 * - Android app → always dashboard
 * - Authenticated web user → always dashboard
 * - Unauthenticated web user → landing (unless confirmed "Continue on Web" within 24h)
 */
export default function HomeGate({
  dashboard,
  landing,
}: {
  dashboard: React.ReactNode;
  landing: React.ReactNode;
}) {
  const isAndroid = getIsAndroidApp();
  const { user, loading } = useAuth();
  const [webConfirmed, setWebConfirmed] = useState(() => hasWebConfirmation());

  const confirmAndEnter = useCallback(() => {
    confirmWebUsage();
    setWebConfirmed(true);
  }, []);

  const value = { confirmAndEnter };

  // Android → always dashboard
  if (isAndroid) return <WebGateContext.Provider value={value}>{dashboard}</WebGateContext.Provider>;

  // While auth is loading, show nothing to avoid flash
  if (loading) return null;

  // Logged in → always dashboard
  if (user) return <WebGateContext.Provider value={value}>{dashboard}</WebGateContext.Provider>;

  // Not logged in → landing unless they clicked "Continue on Web"
  if (webConfirmed) return <WebGateContext.Provider value={value}>{dashboard}</WebGateContext.Provider>;

  return <WebGateContext.Provider value={value}>{landing}</WebGateContext.Provider>;
}
