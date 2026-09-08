import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "ProPredict <noreply@propredict.me>";
const SUPPORT_INBOX = "ilonacvitkopt@gmail.com";

const shell = (inner: string) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;padding:32px 28px;max-width:560px;margin:0 auto;">
    <h2 style="color:#0F9B8E;letter-spacing:0.5px;text-transform:uppercase;font-size:18px;margin:0 0 24px;">ProPredict</h2>
    ${inner}
  </div>
`;

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildWelcome(name: string) {
  return {
    subject: "Welcome to ProPredict ⚽ / Dobrodošli u ProPredict",
    html: shell(`
      <h1 style="color:#0d1a15;font-size:24px;margin:0 0 4px;">Welcome${name ? `, ${escapeHtml(name)}` : ""}! ⚽</h1>
      <h2 style="color:#0F9B8E;font-size:17px;font-weight:600;margin:0 0 16px;">Dobrodošli${name ? `, ${escapeHtml(name)}` : ""}!</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Your account is active. Enjoy daily AI predictions, live scores, league statistics and free tips.
      </p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Vaš nalog je aktivan. Uživajte u dnevnim AI predikcijama, live rezultatima, statistici liga i besplatnim tipovima.
      </p>
      <a href="https://propredict.me" style="display:inline-block;background:#0F9B8E;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600;">
        Open ProPredict / Otvori ProPredict
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;">
        18+. Entertainment only. / Samo za zabavu.
      </p>
    `),
  };
}

function buildContact(d: Record<string, unknown>) {
  return {
    subject: `Support: ${escapeHtml(d.subject) || "New message"}`,
    html: shell(`
      <h1 style="color:#0d1a15;font-size:20px;margin:0 0 16px;">New support message</h1>
      <p style="color:#4b5563;font-size:14px;margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(d.name)}</p>
      <p style="color:#4b5563;font-size:14px;margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(d.email)}</p>
      <p style="color:#4b5563;font-size:14px;margin:0 0 16px;"><strong>Subject:</strong> ${escapeHtml(d.subject)}</p>
      <div style="background:#f0fdfa;border-radius:10px;padding:16px 20px;color:#0d1a15;font-size:14px;white-space:pre-wrap;">${escapeHtml(d.message)}</div>
    `),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Email not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const type = body?.type as string;
    let to: string[];
    let built: { subject: string; html: string };

    if (type === "welcome") {
      if (!body?.email) throw new Error("email required");
      to = [String(body.email)];
      built = buildWelcome(String(body.name ?? ""));
    } else if (type === "contact") {
      to = [SUPPORT_INBOX];
      built = buildContact(body ?? {});
    } else {
      return new Response(JSON.stringify({ error: "Unknown email type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: built.subject,
        html: built.html,
        ...(type === "contact" && body?.email ? { reply_to: String(body.email) } : {}),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Resend failed", resp.status, text);
      return new Response(JSON.stringify({ error: "Send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-app-email error", e);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
