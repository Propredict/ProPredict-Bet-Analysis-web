import emailjs from "@emailjs/browser";
import type { User } from "@supabase/supabase-js";

const STORAGE_KEY_PREFIX = "pp_welcome_sent:";

// In-memory lock to prevent concurrent sends within the same session
const sendingInProgress = new Set<string>();

const getEmailJsConfig = () => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
  const welcomeTemplateId = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  return { serviceId, adminTemplateId, welcomeTemplateId, publicKey };
};

/**
 * Checks if this is truly a first-time login (new signup).
 * Only returns true for accounts created within the last 5 minutes.
 */
const isFirstTimeLogin = (user: User): boolean => {
  const createdAtMs = Date.parse(user.created_at);
  if (!Number.isFinite(createdAtMs)) return false;

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  return Date.now() - createdAtMs <= FIVE_MINUTES_MS;
};

/**
 * Checks if welcome emails have already been sent for this user.
 */
const hasAlreadySentEmails = (userId: string): boolean => {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  return localStorage.getItem(key) === "1";
};

/**
 * Marks that welcome emails have been sent for this user.
 */
const markEmailsSent = (userId: string): void => {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, "1");
};

/**
 * Send welcome and admin notification emails for new signups.
 * 
 * IMPORTANT: This should only be called ONCE per user, on their first login.
 * Multiple guards are in place:
 * 1. localStorage flag persists across page reloads
 * 2. In-memory Set prevents concurrent calls within the same session
 * 3. Time-based check ensures only recent signups receive emails
 */
export const maybeSendPostSignupEmails = async (user: User): Promise<void> => {
  try {
    // Guard 1: Basic validation
    if (!user?.id || !user?.email) return;

    // Guard 2: Only send for accounts created in the last 5 minutes
    if (!isFirstTimeLogin(user)) return;

    // Guard 3: Check localStorage - already sent
    if (hasAlreadySentEmails(user.id)) return;

    // Guard 4: In-memory lock - prevent concurrent sends
    if (sendingInProgress.has(user.id)) return;
    sendingInProgress.add(user.id);

    // Mark as sent IMMEDIATELY (before async calls) to prevent race conditions
    markEmailsSent(user.id);

    const { serviceId, adminTemplateId, welcomeTemplateId, publicKey } =
      getEmailJsConfig();

    if (!serviceId || !adminTemplateId || !welcomeTemplateId || !publicKey) {
      console.warn("EmailJS configuration missing for post-signup notifications");
      return;
    }

    const signupDate = new Date(user.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send both emails (admin notification + welcome email)
    await Promise.all([
      // Admin notification
      emailjs.send(
        serviceId,
        adminTemplateId,
        {
          name: user.email.split("@")[0],
          title: "New user signup",
          message: `New user signup:\n\nEmail: ${user.email}\nSignup Date: ${signupDate}`,
        },
        publicKey
      ),
      // Welcome email to user
      emailjs.send(
        serviceId,
        welcomeTemplateId,
        {
          to_name: user.email.split("@")[0],
          email: user.email,
        },
        publicKey
      ),
    ]);

    console.log("Post-signup emails sent successfully for user:", user.id);
  } catch (error) {
    console.error("Failed to send post-signup emails:", error);
  } finally {
    // Always clean up the in-memory lock
    sendingInProgress.delete(user.id);
  }
};
