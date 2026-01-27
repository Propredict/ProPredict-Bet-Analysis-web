import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map price IDs to plans
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1So1aOL8E849h6yxa6XtgjRj": "basic",   // Pro monthly
  "price_1SpZ5OL8E849h6yxLP3NB1pi": "basic",   // Pro yearly
  "price_1SpWSoL8E849h6yxK7hBWrRm": "premium", // Premium monthly
  "price_1SpZ64L8E849h6yxd2Fnz1YP": "premium", // Premium yearly
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeKey || !webhookSecret) {
      console.error("Missing Stripe configuration");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      if (!customerEmail) {
        console.error("No customer email found in session");
        return new Response(
          JSON.stringify({ error: "No customer email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get subscription details
      const subscriptionId = session.subscription as string;
      if (!subscriptionId) {
        console.error("No subscription ID in session");
        return new Response(
          JSON.stringify({ error: "No subscription" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = PRICE_TO_PLAN[priceId] || "basic";
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      console.log(`Processing subscription for ${customerEmail}: plan=${plan}, expires=${currentPeriodEnd.toISOString()}`);

      // Use service role to bypass RLS
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Find user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error("Error fetching users:", userError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = userData.users.find(u => u.email === customerEmail);
      
      if (!user) {
        console.error(`No user found with email: ${customerEmail}`);
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert subscription
      const { error: upsertError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan: plan,
            expires_at: currentPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Error upserting subscription:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Successfully updated subscription for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
