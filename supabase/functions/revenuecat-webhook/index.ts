import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fire-and-forget admin notification via Resend
async function notifyAdmin(plan: string, email: string, userId: string, source: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "ProPredict <noreply@propredict.me>",
        to: ["ilonacvitkopt@gmail.com"],
        subject: `🚀 Nova prodaja na ProPredict!`,
        html: `<p>Stigla je nova pretplata!</p><ul><li><b>Plan:</b> ${plan === "premium" ? "Premium" : "Pro"}</li><li><b>Izvor:</b> ${source}</li><li><b>Email:</b> ${email}</li><li><b>User ID:</b> ${userId}</li><li><b>Datum:</b> ${new Date().toISOString()}</li></ul>`,
      }),
    });
  } catch (e) {
    console.error("Admin notification failed:", e);
  }
}

// Send "Thank you for your purchase" email to the customer — ONLY after
// the subscription has been successfully written as active in Supabase.
// Idempotent via user_subscriptions.purchase_email_sent_at, so RENEWAL
// events (which fire every billing cycle) do NOT re-send the email.
async function sendPurchaseEmailIfNeeded(
  supabase: any,
  userId: string,
  email: string,
  plan: string
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || !email) return;

  try {
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("purchase_email_sent_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.purchase_email_sent_at) {
      console.log(`Purchase email already sent for user ${userId} — skipping`);
      return;
    }

    const planLabel = plan === "premium" ? "Premium" : "Pro";
    const price = plan === "premium" ? "€5.99" : "€3.99";
    const orderId = `PP-${Date.now().toString(36).toUpperCase()}`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;padding:32px 28px;max-width:560px;margin:0 auto;">
        <h2 style="color:#0F9B8E;letter-spacing:0.5px;text-transform:uppercase;font-size:18px;margin:0 0 24px;">ProPredict</h2>
        <h1 style="color:#0d1a15;font-size:24px;margin:0 0 16px;">Thank you for your purchase! 🎉</h1>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Your <strong>${planLabel}</strong> subscription is now active. Enjoy AI predictions, live scores, and daily picks.
        </p>
        <table style="width:100%;background:#f0fdfa;border-radius:10px;padding:16px 20px;margin:0 0 24px;color:#0d1a15;font-size:14px;">
          <tr><td><strong>Order:</strong></td><td style="text-align:right;">${orderId}</td></tr>
          <tr><td><strong>Plan:</strong></td><td style="text-align:right;">${planLabel}</td></tr>
          <tr><td><strong>Total:</strong></td><td style="text-align:right;">${price}</td></tr>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;">
          Manage your subscription any time in Profile → Subscription.
        </p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "ProPredict <noreply@propredict.me>",
        to: [email],
        subject: `Thank you for your ProPredict ${planLabel} purchase`,
        html,
      }),
    });

    if (!resp.ok) {
      console.error(`Resend failed [${resp.status}]:`, await resp.text());
      return;
    }

    await supabase
      .from("user_subscriptions")
      .update({ purchase_email_sent_at: new Date().toISOString() })
      .eq("user_id", userId);

    console.log(`Purchase email sent to ${email} for user ${userId}`);
  } catch (e) {
    console.error("sendPurchaseEmailIfNeeded failed:", e);
  }
}

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

    // MANDATORY authorization: refuse to process if the webhook secret is
    // not configured. Without this, anyone could POST a forged event and
    // grant arbitrary users premium subscriptions.
    if (!webhookSecret) {
      console.error("RevenueCat webhook: REVENUECAT_WEBHOOK_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error("RevenueCat webhook: Invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      "SUBSCRIPTION_EXTENDED",
      "TEMPORARY_ENTITLEMENT_GRANT",
    ];

    // Handle expiration → fully deactivate subscription
    const deactivateEvents = [
      "EXPIRATION",
    ];

    // Handle cancellation → mark as canceled but keep plan until expires_at
    const cancelEvents = [
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
            subscription_source: "google_play",
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

      // Notify admin about new sale (fire-and-forget)
      notifyAdmin(plan, userData.user.email || "unknown", userId, "Google Play");

      // Send purchase confirmation to CUSTOMER — only on the first purchase
      // (idempotent via purchase_email_sent_at, so RENEWAL won't re-send).
      await sendPurchaseEmailIfNeeded(
        supabase,
        userId,
        userData.user.email || "",
        plan
      );
    } else if (deactivateEvents.includes(eventType)) {
      console.log(`RevenueCat webhook: Expiring subscription for user ${userId}`);

      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          plan: "free",
          status: "expired",
          subscription_source: "google_play",
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("RevenueCat webhook: Error expiring subscription:", error);
        return new Response(
          JSON.stringify({ error: "Failed to expire subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`RevenueCat webhook: Successfully expired subscription for user ${userId}`);
    } else if (cancelEvents.includes(eventType)) {
      // CANCELLATION: User canceled but should keep access until expires_at
      console.log(`RevenueCat webhook: Marking subscription as canceled for user ${userId}, keeping plan until expiry`);

      // Only update status to "canceled" — keep existing plan, source, and expires_at
      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("RevenueCat webhook: Error marking cancellation:", error);
      } else {
        console.log(`RevenueCat webhook: Successfully marked canceled for user ${userId}`);
      }
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
