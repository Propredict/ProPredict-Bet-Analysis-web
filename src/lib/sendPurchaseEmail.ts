import { supabase } from "@/integrations/supabase/client";

/* =====================
   Welcome Email (on sign-up)
   Sent via our own Supabase email system (domain: propredict.me).
===================== */
export async function sendWelcomeEmail(
  name: string,
  email: string,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-app-email", {
      body: { type: "welcome", name, email },
    });
    if (error) throw error;
    console.log("[Email] Welcome email queued for", email);
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
  }
}

/* =====================
   DEPRECATED – kept for backward compat, now calls sendWelcomeEmail
===================== */
export async function sendPurchaseConfirmationEmail(
  name: string,
  email: string,
): Promise<void> {
  return sendWelcomeEmail(name, email);
}
