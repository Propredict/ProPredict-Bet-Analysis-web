import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * RevenueCat Webhook Handler
 * 
 * Syncs Android RevenueCat purchases to Supabase user_subscriptions.
 * 
 * RevenueCat sends app_user_id which should be set to the Supabase auth user ID
 * when configuring RevenueCat in the Android app:
 *   Purchases.configure(this, "rc_api_key") 
 *   Purchases.sharedInstance.logIn(supabaseUserId)
 * 
 * Entitlement → Plan mapping:
 *   "pro" entitlement  → plan = "basic"
 *   "premium" entitlement → plan = "premium"
 * 
 * Events handled:
 *   INITIAL_PURCHASE, RENEWAL, UNCANCELLATION → activate subscription
 *   EXPIRATION, CANCELLATION → deactivate subscription
 */

// Map RevenueCat entitlement identifiers to our plan names
function getPlanFromEntitlement(entitlementId: string): string {
  const id = entitlementId.toLowerCase();
  if (id === "premium") return "premium";
  // "pro" or any other entitlement defaults to basic
  return "basic";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    // Verify authorization header if webhook secret is configured
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
        console.error("RevenueCat webhook: Invalid authorization header");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    
    // RevenueCat webhook v1 payload structure
    const event = body.event;
    if (!event) {
      console.error("RevenueCat webhook: No event in payload");
      return new Response(
        JSON.stringify({ error: "No event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;
    const entitlementIds: string[] = event.entitlement_ids || [];
    const expirationAtMs = event.expiration_at_ms;

    console.log(`RevenueCat webhook: type=${eventType}, app_user_id=${appUserId}, entitlements=${JSON.stringify(entitlementIds)}`);

    if (!appUserId) {
      console.error("RevenueCat webhook: Missing app_user_id");
      return new Response(
        JSON.stringify({ error: "Missing app_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine the user ID - app_user_id should be the Supabase user UUID
    // If it's prefixed with "$RCAnonymousID:", try to find user by other means
    let userId = appUserId;

    // If RevenueCat sends an anonymous ID, we can't identify the user
    if (appUserId.startsWith("$RCAnonymousID:")) {
      console.error("RevenueCat webhook: Anonymous user ID, cannot sync. Ensure Purchases.logIn(supabaseUserId) is called in the Android app.");
      return new Response(
        JSON.stringify({ error: "Anonymous user - cannot sync" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user exists in Supabase auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      console.error(`RevenueCat webhook: User not found in Supabase auth: ${userId}`, userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`RevenueCat webhook: Found user ${userData.user.id} (${userData.user.email})`);

    // Handle purchase/renewal events → activate subscription
    const activateEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "NON_RENEWING_PURCHASE",
      "PRODUCT_CHANGE",
    ];

    // Handle cancellation/expiration events → deactivate subscription
    const deactivateEvents = [
      "EXPIRATION",
      "CANCELLATION",
    ];

    if (activateEvents.includes(eventType)) {
      // Determine plan from entitlements (highest tier wins)
      let plan = "basic"; // default for pro
      if (entitlementIds.length > 0) {
        // If any entitlement is "premium", set premium; otherwise basic
        const hasPremium = entitlementIds.some(id => id.toLowerCase() === "premium");
        plan = hasPremium ? "premium" : "basic";
      }

      // Calculate expiration
      const expiresAt = expirationAtMs 
        ? new Date(expirationAtMs).toISOString()
        : null; // lifetime or no expiry

      console.log(`RevenueCat webhook: Activating ${plan} for user ${userId}, expires=${expiresAt}`);

      const { error: upsertError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: plan,
            status: "active",
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("RevenueCat webhook: Error upserting subscription:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`RevenueCat webhook: Successfully activated ${plan} for user ${userId}`);
    } else if (deactivateEvents.includes(eventType)) {
      console.log(`RevenueCat webhook: Deactivating subscription for user ${userId}`);

      const { error } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: "free",
            status: eventType === "EXPIRATION" ? "expired" : "canceled",
            expires_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("RevenueCat webhook: Error deactivating subscription:", error);
        return new Response(
          JSON.stringify({ error: "Failed to deactivate subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`RevenueCat webhook: Successfully deactivated subscription for user ${userId}`);
    } else if (eventType === "BILLING_ISSUE") {
      console.log(`RevenueCat webhook: Billing issue for user ${userId}`);

      // Mark as past_due but don't remove plan yet (RevenueCat handles grace period)
      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("RevenueCat webhook: Error updating billing issue:", error);
      }
    } else {
      console.log(`RevenueCat webhook: Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("RevenueCat webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
