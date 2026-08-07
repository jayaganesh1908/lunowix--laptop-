import "server-only";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM_EMAIL ?? "Lunowix <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function welcomeHtml(name: string) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  // Inline styles and a table layout: email clients strip <style> blocks and
  // have no flexbox worth relying on.
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121212;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px 32px 0;">
        <span style="display:inline-block;font-size:13px;font-weight:700;letter-spacing:3px;color:#ff6b00;">LUNOWIX</span>
      </td></tr>
      <tr><td style="padding:20px 32px 0;">
        <h1 style="margin:0;font-size:26px;line-height:1.25;color:#faf8f6;font-weight:700;">Welcome to Lunowix</h1>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c7bfb7;">${greeting}</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#c7bfb7;">
          Your account is ready. Lunowix scores every laptop for coding, gaming, editing,
          battery, display and AI work &mdash; so you can start from what you actually do
          rather than a spec sheet.
        </p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#c7bfb7;">A good place to start:</p>
        <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.8;color:#c7bfb7;">
          <li>Browse by budget &mdash; six price bands across the catalogue</li>
          <li>Check estimated frame rates for ten popular games</li>
          <li>See whether Android Studio, Premiere Pro or Blender will actually run</li>
          <li>Put two machines side by side and compare every row</li>
        </ul>
      </td></tr>
      <tr><td style="padding:4px 32px 0;">
        <a href="${SITE_URL}/laptops"
           style="display:inline-block;background:#ff6b00;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px;">
          Browse laptops
        </a>
      </td></tr>
      <tr><td style="padding:28px 32px 32px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8b837c;border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;">
          You are receiving this because an account was created with this address at Lunowix.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`.trim();
}

function welcomeText(name: string) {
  return [
    name ? `Hi ${name},` : "Hi there,",
    "",
    "Welcome to Lunowix. Your account is ready.",
    "",
    "Lunowix scores every laptop for coding, gaming, editing, battery, display and",
    "AI work, so you can start from what you actually do rather than a spec sheet.",
    "",
    "A good place to start:",
    "  - Browse by budget across six price bands",
    "  - Check estimated frame rates for ten popular games",
    "  - See whether Android Studio, Premiere Pro or Blender will run",
    "  - Put two machines side by side",
    "",
    `Browse laptops: ${SITE_URL}/laptops`,
  ].join("\n");
}

/**
 * Sends the welcome mail. Never throws.
 *
 * Sign-in must not fail because an email provider is down or unconfigured, so
 * every failure here is logged and swallowed. The caller only stamps
 * `welcome_email_sent_at` when this returns true, so a transient failure means
 * the mail is retried on the next sign-in rather than lost.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  if (!resend) {
    console.warn("[lunowix] RESEND_API_KEY not set — skipping welcome email.");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Welcome to Lunowix",
      html: welcomeHtml(name),
      text: welcomeText(name),
    });

    if (error) {
      console.error("[lunowix] Welcome email failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[lunowix] Welcome email threw:", error);
    return false;
  }
}
