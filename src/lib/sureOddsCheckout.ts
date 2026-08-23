import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Stripe one-time price for the Sure Odds 2+ daily ticket (web only) */
export const SURE_ODDS_STRIPE_PRICE_ID = "price_1U7djRL8E849h6yxz8pN7Gzy";

/**
 * Starts a Stripe Checkout session (one-time payment) for today's
 * Sure Odds 2+ ticket. Android uses RevenueCat/Google Play instead.
 */
export async function startSureOddsWebCheckout(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    toast.error("Please sign in to purchase today's ticket.");
    window.location.href = "/auth";
    return;
  }

  try {
    const response = await supabase.functions.invoke("create-checkout-session", {
      body: {
        priceId: SURE_ODDS_STRIPE_PRICE_ID,
        mode: "payment",
        purchaseType: "daily_ticket",
        successUrl: `${window.location.origin}/pro-predictions?payment=success&product=sure_odds`,
        cancelUrl: `${window.location.origin}/pro-predictions`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || "Failed to create checkout session");
    }

    if (response.data?.url) {
      window.location.href = response.data.url;
      return;
    }
    throw new Error("No checkout URL returned");
  } catch (e) {
    console.error("[sureOddsCheckout]", e);
    toast.error("Could not start checkout. Please try again.");
  }
}
