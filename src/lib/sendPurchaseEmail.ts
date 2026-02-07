import emailjs from "@emailjs/browser";

/**
 * Send a purchase confirmation email via EmailJS.
 * Uses the same service/public-key already configured for the project.
 *
 * Template: template_b724wpv  (variables: {{name}}, {{email}})
 */
export async function sendPurchaseConfirmationEmail(
  name: string,
  email: string,
): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID; // template_b724wpv
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn("[PurchaseEmail] EmailJS not configured – skipping email.");
    return;
  }

  try {
    await emailjs.send(serviceId, templateId, { name, email }, publicKey);
    console.log("[PurchaseEmail] Confirmation email sent to", email);
  } catch (err) {
    // Fire-and-forget: log but don't break the purchase flow
    console.error("[PurchaseEmail] Failed to send confirmation email:", err);
  }
}
