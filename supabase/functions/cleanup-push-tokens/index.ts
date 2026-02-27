/**
 * cleanup-push-tokens
 *
 * Validates all push tokens in users_push_tokens by sending
 * a silent test to OneSignal. Removes tokens that return
 * "invalid_player_ids" errors.
 *
 * Call manually: POST /cleanup-push-tokens
 * Requires service role (admin only).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").trim();
  const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").trim();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OneSignal credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all tokens
  const { data: tokens, error } = await supabase
    .from("users_push_tokens")
    .select("id, onesignal_player_id, user_id, platform");

  if (error || !tokens) {
    return new Response(JSON.stringify({ error: "Failed to fetch tokens", details: error?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[cleanup] Found ${tokens.length} tokens to validate`);

  const invalidIds: string[] = [];
  const validCount: number[] = [];

  // Batch validate: send silent push in groups of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const playerIds = batch.map((t) => t.onesignal_player_id);

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      // Silent notification — won't show to users
      content_available: true,
      contents: { en: "" },
      // Minimal TTL
      ttl: 0,
    };

    try {
      const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const osResult = await osRes.json();
      const batchInvalid: string[] = osResult?.errors?.invalid_player_ids ?? [];

      if (batchInvalid.length > 0) {
        invalidIds.push(...batchInvalid);
        console.log(`[cleanup] Batch ${i / BATCH_SIZE + 1}: ${batchInvalid.length} invalid tokens found`);
      } else {
        console.log(`[cleanup] Batch ${i / BATCH_SIZE + 1}: all ${batch.length} tokens valid`);
      }

      validCount.push(batch.length - batchInvalid.length);
    } catch (e) {
      console.error(`[cleanup] Batch ${i / BATCH_SIZE + 1} failed:`, e);
    }
  }

  // Delete invalid tokens from database
  let deleted = 0;
  if (invalidIds.length > 0) {
    const { error: delError, count } = await supabase
      .from("users_push_tokens")
      .delete()
      .in("onesignal_player_id", invalidIds);

    if (delError) {
      console.error("[cleanup] Delete error:", delError.message);
    } else {
      deleted = count ?? invalidIds.length;
      console.log(`[cleanup] Deleted ${deleted} invalid tokens`);
    }
  }

  const totalValid = validCount.reduce((a, b) => a + b, 0);

  return new Response(
    JSON.stringify({
      total_tokens: tokens.length,
      valid: totalValid,
      invalid: invalidIds.length,
      deleted,
      invalid_ids: invalidIds,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});