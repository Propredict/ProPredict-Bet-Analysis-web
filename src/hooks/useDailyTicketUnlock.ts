import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackSureOddsUnlockOnce } from "@/lib/sureOddsAnalytics";

export const SURE_ODDS_PRODUCT_ID = "sure_odds_2plus_daily";
export const SURE_ODDS_PRICE_LABEL = "€3.99";
export const SURE_ODDS_PURCHASE_PENDING_KEY = "propredict:sure-odds-purchase-pending";

const SUCCESS_EVENT_TYPES = new Set([
  "DAILY_TICKET_PURCHASE_SUCCESS",
  "PURCHASE_SUCCESS",
  "REVENUECAT_PURCHASE_SUCCESS",
]);

function parseNativePayload(event: Event): Record<string, unknown> {
  const raw = event instanceof CustomEvent ? event.detail : (event as MessageEvent).data;
  if (typeof raw !== "string") return (raw as Record<string, unknown>) ?? {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getProductId(data: Record<string, unknown>): string {
  return String(
    data.productId ??
      data.product_id ??
      data.productIdentifier ??
      (data.product as Record<string, unknown> | undefined)?.identifier ??
      ""
  );
}

/** Today's date (YYYY-MM-DD) in Europe/Belgrade */
export function belgradeToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

/**
 * Checks whether the signed-in user has purchased today's Sure Odds 2+ ticket.
 * Premium access is handled separately by useUserPlan.
 */
export function useDailyTicketUnlock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = belgradeToday();
  const queryKey = useMemo(
    () => ["daily-ticket-unlock", user?.id, today] as const,
    [today, user?.id]
  );

  const fetchUnlock = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    const { data, error } = await (supabase as any)
      .from("daily_ticket_unlocks")
      .select("id, product_id, transaction_id, source")
      .eq("user_id", user.id)
      .eq("unlock_date", today)
      .maybeSingle();

    if (error) {
      console.error("[SureOdds][Unlock] Supabase check failed", {
        userId: user.id,
        date: today,
        error: error.message,
      });
      return false;
    }
    if (data) {
      console.log("[SureOdds][Unlock] Successful unlock found", {
        productId: data.product_id,
        transactionId: data.transaction_id,
        source: data.source,
        date: today,
      });
      try { sessionStorage.removeItem(SURE_ODDS_PURCHASE_PENDING_KEY); } catch {}
      trackSureOddsUnlockOnce(user.id, today, String(data.source ?? "unknown"));
    }
    return Boolean(data);
  }, [today, user?.id]);

  const { data: hasTodayUnlock = false, isLoading, refetch: refetchQuery } = useQuery({
    queryKey,
    queryFn: fetchUnlock,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    const result = await refetchQuery();
    return result.data ?? false;
  }, [queryClient, queryKey, refetchQuery]);

  useEffect(() => {
    if (!user?.id) return;

    let timers: ReturnType<typeof setTimeout>[] = [];
    const handlePurchaseResult = (event: Event) => {
      const data = parseNativePayload(event);
      const type = String(data.type ?? "");
      const productId = getProductId(data);
      let pendingDailyPurchase = false;
      try { pendingDailyPurchase = sessionStorage.getItem(SURE_ODDS_PURCHASE_PENDING_KEY) === "1"; } catch {}

      const isDailySuccess = SUCCESS_EVENT_TYPES.has(type) &&
        (type === "DAILY_TICKET_PURCHASE_SUCCESS" || productId === SURE_ODDS_PRODUCT_ID || pendingDailyPurchase);
      if (!isDailySuccess) return;

      const transactionId = data.transactionId ?? data.transaction_id ?? data.purchaseToken ?? data.purchase_token;
      console.log("[SureOdds][Android] Google Play / RevenueCat purchase result", {
        type,
        productId: productId || SURE_ODDS_PRODUCT_ID,
        transactionId: transactionId ?? "not-provided",
        success: true,
      });

      timers.forEach(clearTimeout);
      // RevenueCat webhooks are asynchronous. One shared React Query cache keeps
      // the dashboard, page and provider in sync as soon as the row arrives.
      [0, 1500, 3000, 6000, 10_000, 20_000, 40_000, 60_000].forEach((delay) => {
        timers.push(setTimeout(() => void refetch(), delay));
      });
    };

    window.addEventListener("message", handlePurchaseResult);
    document.addEventListener("message", handlePurchaseResult);
    window.addEventListener("revenuecat-purchase-success", handlePurchaseResult);
    return () => {
      window.removeEventListener("message", handlePurchaseResult);
      document.removeEventListener("message", handlePurchaseResult);
      window.removeEventListener("revenuecat-purchase-success", handlePurchaseResult);
      timers.forEach(clearTimeout);
    };
  }, [refetch, user?.id]);

  return { hasTodayUnlock, isLoading, refetch };
}
