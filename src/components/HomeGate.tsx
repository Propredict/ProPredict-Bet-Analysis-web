import { getIsAndroidApp } from "@/hooks/usePlatform";
import { hasWebConfirmation } from "@/hooks/useWebGate";

/**
 * Gate component: on web, show landing page unless user confirmed "Continue on Web" (24h).
 * Android app users always skip to dashboard.
 */
export default function HomeGate({
  dashboard,
  landing,
}: {
  dashboard: React.ReactNode;
  landing: React.ReactNode;
}) {
  const isAndroid = getIsAndroidApp();

  // Android users → always dashboard
  if (isAndroid) return <>{dashboard}</>;

  // Web users → landing unless confirmed
  if (hasWebConfirmation()) return <>{dashboard}</>;

  return <>{landing}</>;
}
