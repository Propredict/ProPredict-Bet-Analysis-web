import { toast } from "sonner";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { startSureOddsWebCheckout } from "@/lib/sureOddsCheckout";
import { SURE_ODDS_PURCHASE_PENDING_KEY } from "@/hooks/useDailyTicketUnlock";

/** Google Play / RevenueCat one-time (INAPP) product for the Sure Odds 2+ daily ticket */
export const SURE_ODDS_RC_PRODUCT_ID = "sure_odds_2plus_daily";

/** How long we wait for ANY native response before telling the user something is wrong */
const NATIVE_RESPONSE_TIMEOUT_MS = 12_000;

let watchdog: ReturnType<typeof setTimeout> | null = null;
let listenerAttached = false;

function clearWatchdog() {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

/**
 * Listens for native purchase feedback so we can surface the REAL RevenueCat /
 * Google Play error instead of leaving the user on "Opening Google Play purchase…".
 */
function attachNativeListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;

  const handleNativeMessage = (event: Event) => {
    const rawData = event instanceof CustomEvent ? event.detail : (event as MessageEvent).data;
    const data =
      typeof rawData === "string"
        ? (() => {
            try {
              return JSON.parse(rawData);
            } catch {
              return {};
            }
          })()
        : rawData;

    const type = data?.type;
    if (!type) return;

    if (
      type === "DAILY_TICKET_PURCHASE_SUCCESS" ||
      type === "PURCHASE_SUCCESS" ||
      type === "REVENUECAT_PURCHASE_SUCCESS" ||
      type === "DAILY_TICKET_PURCHASE_FAILED" ||
      type === "DAILY_TICKET_PURCHASE_CANCELLED" ||
      type === "PURCHASE_ERROR"
    ) {
      clearWatchdog();
    }

    if (type === "DAILY_TICKET_PURCHASE_FAILED" || type === "DAILY_TICKET_PURCHASE_CANCELLED" || type === "PURCHASE_ERROR") {
      try { sessionStorage.removeItem(SURE_ODDS_PURCHASE_PENDING_KEY); } catch {}
    }

    if (type === "DAILY_TICKET_PURCHASE_SUCCESS" || type === "PURCHASE_SUCCESS" || type === "REVENUECAT_PURCHASE_SUCCESS") {
      const productId = data.productId ?? data.product_id ?? data.productIdentifier ?? SURE_ODDS_RC_PRODUCT_ID;
      const transactionId = data.transactionId ?? data.transaction_id ?? data.purchaseToken ?? data.purchase_token;
      console.log("[SureOdds][Android] RevenueCat purchase success callback", {
        type,
        productId,
        transactionId: transactionId ?? "not-provided",
      });
    }

    if (type === "DAILY_TICKET_PURCHASE_FAILED" || type === "PURCHASE_ERROR") {
      const code = data.code ?? data.errorCode ?? "UNKNOWN";
      const message = data.message ?? data.error ?? "Purchase failed";
      console.error("[SureOdds][Android] Purchase error from native:", { code, message, raw: data });

      const friendly: Record<string, string> = {
        ITEM_UNAVAILABLE:
          "This product is not available on your Google Play account yet (closed testing / not rolled out).",
        PRODUCT_NOT_AVAILABLE_FOR_PURCHASE:
          "Google Play cannot find this product. Make sure it is active and in the current release track.",
        DEVELOPER_ERROR: "Google Play configuration error (wrong product ID or signing key).",
        STORE_PROBLEM: "Google Play store error. Please try again later.",
        PURCHASE_NOT_ALLOWED: "Purchases are not allowed on this Google account/device.",
        PURCHASE_CANCELLED: "Purchase cancelled.",
      };

      toast.error(friendly[String(code)] ?? `Purchase failed (${code}): ${message}`);
    }
  };

  window.addEventListener("message", handleNativeMessage);
  document.addEventListener("message", handleNativeMessage);
  window.addEventListener("revenuecat-purchase-success", handleNativeMessage);
}

/**
 * Routes the Sure Odds 2+ daily ticket purchase to the correct store:
 * - Android app  -> Google Play one-time (INAPP) product via RevenueCat (native bridge)
 * - Web          -> Stripe one-time checkout (unchanged)
 *
 * Android NEVER falls back to Stripe (Play policy + wrong product).
 */
export function startSureOddsPurchase(onPending?: () => void): void {
  if (getIsAndroidApp()) {
    attachNativeListener();
    try { sessionStorage.setItem(SURE_ODDS_PURCHASE_PENDING_KEY, "1"); } catch {}

    const android = window.Android as
      | (typeof window.Android & {
          purchaseProduct?: (productId: string) => void;
          purchaseInAppProduct?: (productId: string) => void;
          purchasePlan?: (planId: string) => void;
        })
      | undefined;

    // Diagnostic: log which bridge methods this APK build actually exposes.
    const available = android
      ? Object.keys(android).filter((k) => typeof (android as any)[k] === "function")
      : [];
    console.log("[SureOdds][Android] Bridge methods available:", available);

    if (!android) {
      try { sessionStorage.removeItem(SURE_ODDS_PURCHASE_PENDING_KEY); } catch {}
      console.error("[SureOdds][Android] window.Android bridge is missing");
      toast.error("Purchase unavailable: app bridge not detected.");
      return;
    }

    let called: string | null = null;
    try {
      if (typeof android.purchaseDailyTicket === "function") {
        android.purchaseDailyTicket();
        called = "purchaseDailyTicket()";
      } else if (typeof android.purchaseInAppProduct === "function") {
        android.purchaseInAppProduct(SURE_ODDS_RC_PRODUCT_ID);
        called = `purchaseInAppProduct(${SURE_ODDS_RC_PRODUCT_ID})`;
      } else if (typeof android.purchaseProduct === "function") {
        android.purchaseProduct(SURE_ODDS_RC_PRODUCT_ID);
        called = `purchaseProduct(${SURE_ODDS_RC_PRODUCT_ID})`;
      } else {
        try { sessionStorage.removeItem(SURE_ODDS_PURCHASE_PENDING_KEY); } catch {}
        console.error(
          "[SureOdds][Android] No one-time purchase method on bridge. Available:",
          available
        );
        toast.error(
          "This app version can't buy the daily ticket yet. Please update the app from Google Play."
        );
        return;
      }
    } catch (err) {
      try { sessionStorage.removeItem(SURE_ODDS_PURCHASE_PENDING_KEY); } catch {}
      console.error("[SureOdds][Android] Bridge call threw:", err);
      toast.error("Could not start the Google Play purchase.");
      return;
    }

    console.log("[SureOdds][Android] Purchase initiated", {
      method: called,
      productId: SURE_ODDS_RC_PRODUCT_ID,
      category: "INAPP",
    });
    toast.info("Opening Google Play purchase…");
    onPending?.();

    // Watchdog: if native never answers, the purchase sheet never opened.
    clearWatchdog();
    watchdog = setTimeout(() => {
      console.error(
        `[SureOdds][Android] No native response ${NATIVE_RESPONSE_TIMEOUT_MS}ms after ${called}. ` +
          `Likely causes: RevenueCat has no StoreProduct for "${SURE_ODDS_RC_PRODUCT_ID}" ` +
          `(ITEM_UNAVAILABLE), product not in the installed release track, or wrong RevenueCat Android SDK key.`
      );
      toast.error(
        "Google Play didn't respond. The product may not be available for this app version/account yet."
      );
    }, NATIVE_RESPONSE_TIMEOUT_MS);

    return;
  }

  // Web only: Stripe one-time checkout (unchanged)
  toast.info("Opening secure checkout…");
  void startSureOddsWebCheckout();
}
