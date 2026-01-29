import emailjs from "@emailjs/browser";
import type { User } from "@supabase/supabase-js";

const STORAGE_PREFIX = "pp_post_signup_emails_sent:";

const getEmailJsConfig = () => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
  const welcomeTemplateId = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  return { serviceId, adminTemplateId, welcomeTemplateId, publicKey };
};

const shouldAttemptForUser = (user: User) => {
  // Frontend-only heuristic to avoid sending welcome/admin emails to long-existing users
  // after deploying this fix.
  const createdAtMs = Date.parse(user.created_at);
  if (!Number.isFinite(createdAtMs)) return false;

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAtMs <= THIRTY_DAYS_MS;
};

export const maybeSendPostSignupEmails = async (user: User) => {
  try {
    if (!user?.id || !user?.email) return;
    // Email confirmation disabled - send emails immediately after signup/login
    if (!shouldAttemptForUser(user)) return;

    const key = `${STORAGE_PREFIX}${user.id}`;
    if (localStorage.getItem(key) === "1") return;

    const { serviceId, adminTemplateId, welcomeTemplateId, publicKey } =
      getEmailJsConfig();

    if (!serviceId || !adminTemplateId || !welcomeTemplateId || !publicKey) {
      console.warn(
        "EmailJS configuration is missing for post-signup notifications"
      );
      return;
    }

    const signupDate = new Date(user.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1) Admin notification (never pass user's email as a top-level recipient field)
    await emailjs.send(
      serviceId,
      adminTemplateId,
      {
        name: user.email.split("@")[0],
        title: "New user signup",
        message: `New user signup:\n\nEmail: ${user.email}\nSignup Date: ${signupDate}`,
      },
      publicKey
    );

    // 2) Welcome email to the user (dedicated Welcome template)
    await emailjs.send(
      serviceId,
      welcomeTemplateId,
      {
        to_name: user.email.split("@")[0],
        email: user.email,
      },
      publicKey
    );

    localStorage.setItem(key, "1");
  } catch (error) {
    console.error("Failed to send post-signup emails:", error);
  }
};
