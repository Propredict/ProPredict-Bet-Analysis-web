import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_wty5549";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/* =====================
   Welcome Email (on sign-up)
   Template: template_b724wpv
   Variables: {{name}}, {{email}}
===================== */
export async function sendWelcomeEmail(
  name: string,
  email: string,
): Promise<void> {
  if (!PUBLIC_KEY) {
    console.warn("[Email] EmailJS public key not configured – skipping welcome email.");
    return;
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      "template_b724wpv",
      { name, email, to_email: email, user_email: email, reply_to: email },
      PUBLIC_KEY,
    );
    console.log("[Email] Welcome email sent to", email);
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
  }
}

/* =====================
   Order Confirmation Email (on purchase)
   Template: template_vpp8vok
   Variables: {{order_id}}, {{name}}, {{price}}, {{cost.total}}, {{email}}
===================== */

/** Generate a unique order ID: PP-<timestamp>-<random> */
function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PP-${ts}-${rand}`;
}

export interface OrderEmailParams {
  email: string;
  /** Plan display name: "Pro" or "Premium" */
  planName: string;
  /** e.g. "3.99" — mapped to {{total_price}} in the template */
  totalPrice: string;
}

export async function sendOrderConfirmationEmail(
  params: OrderEmailParams,
): Promise<void> {
  if (!PUBLIC_KEY) {
    console.warn("[Email] EmailJS public key not configured – skipping order email.");
    return;
  }

  const orderId = generateOrderId();

  try {
    await emailjs.send(
      SERVICE_ID,
      "template_vpp8vok",
      {
        order_id: orderId,
        name: params.planName,
        total_price: params.totalPrice,
        email: params.email,
        to_email: params.email,
      },
      PUBLIC_KEY,
    );
    console.log("[Email] Order confirmation sent to", params.email, "| order:", orderId);
  } catch (err) {
    console.error("[Email] Failed to send order confirmation:", err);
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
