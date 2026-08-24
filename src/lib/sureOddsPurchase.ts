import { toast } from "sonner";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { startSureOddsWebCheckout } from "@/lib/sureOddsCheckout";

/** Google Play / RevenueCat one-time product for the Sure Odds 2+ daily ticket */
export const SURE_ODDS_RC_PRODUCT_ID = "sure_odds_2plus_daily";

/**
 * Routes the Sure Odds 2+ daily ticket purchase to the correct store:
 * - Android app  -> Google Play one-time product via RevenueCat (native bridge)
 * - Web          -> Stripe one-time checkout (unchanged)
 *
 * Android NEVER falls back to Stripe (Play policy + wrong product).
 */
export function startSureOddsPurchase(onPending?: () => void): void {
  if (getIsAndroidApp()) {
    const android = window.Android as
      | (typeof window.Android & {
          purchaseProduct?: (productId: string) => void;
          purchasePlan?: (planId: string) => void;
        })
      | undefined;

    if (android?.purchaseDailyTicket) {
      android.purchaseDailyTicket();
    } else if (typeof android?.purchaseProduct === "function") {
      android.purchaseProduct(SURE_ODDS_RC_PRODUCT_ID);
    } else if (typeof android?.purchasePlan === "function") {
      android.purchasePlan(SURE_ODDS_RC_PRODUCT_ID);
    } else {
      toast.error("Purchase unavailable. Please update the app to the latest version.");
      return;
    }

    toast.info("Opening Google Play purchase…");
    onPending?.();
    return;
  }

  // Web only: Stripe one-time checkout
  toast.info("Opening secure checkout…");
  void startSureOddsWebCheckout();
}
