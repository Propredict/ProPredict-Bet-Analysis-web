import { getIsAndroidApp } from "@/hooks/usePlatform";
import { hasWebConfirmation } from "@/hooks/useWebGate";
import { useAuth } from "@/hooks/useAuth";

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

  // Android → always dashboard
  if (isAndroid) return <>{dashboard}</>;

  // While auth is loading, show nothing to avoid flash
  if (loading) return null;

  // Logged in → always dashboard
  if (user) return <>{dashboard}</>;

  // Not logged in → landing unless they clicked "Continue on Web"
  if (hasWebConfirmation()) return <>{dashboard}</>;

  return <>{landing}</>;
}
