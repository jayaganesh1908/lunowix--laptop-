import "server-only";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM_EMAIL ?? "Lunowix <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Sends a password reset link.
 *
 * Unlike the contact form, the recipient here is the ACCOUNT HOLDER, not the
 * team, so `CONTACT_TO_EMAIL` is irrelevant — only the API key is needed.
 *
 * Reports `unconfigured` rather than pretending, exactly as the contact path
 * does. A reset flow that claims to have sent mail it never sent leaves someone
 * refreshing an inbox forever.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<{ ok: true } | { ok: false; reason: "unconfigured" | "failed" }> {
  if (!resend) {
    console.warn("[lunowix] RESEND_API_KEY not set — password reset email not sent.");
    return { ok: false, reason: "unconfigured" };
  }

  /*
   * The URL is the only interpolated value and it is built server-side from
   * NEXT_PUBLIC_SITE_URL plus a base64url token, so it carries no user input and
   * needs no escaping. Nothing the requester typed reaches this body.
   */
  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr><td style="padding:0 0 12px;font-size:13px;letter-spacing:3px;color:#ff6b00;font-weight:700;">LUNOWIX</td></tr>
  <tr><td style="padding:0 0 8px;font-size:20px;font-weight:700;">Reset your password</td></tr>
  <tr><td style="padding:0 0 20px;font-size:15px;line-height:1.7;color:#444;">
    Use the link below to choose a new password. It works once and expires in an hour.
  </td></tr>
  <tr><td style="padding:0 0 24px;">
    <a href="${resetUrl}" style="display:inline-block;background:#ff6b00;color:#1a1208;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:12px;">Choose a new password</a>
  </td></tr>
  <tr><td style="font-size:13px;line-height:1.7;color:#777;">
    If you did not ask for this, you can ignore this email — your password has not changed.
  </td></tr>
</table>`.trim();

  const text = `Reset your Lunowix password\n\n${resetUrl}\n\nThe link works once and expires in an hour. If you did not ask for this, ignore this email — your password has not changed.`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Reset your Lunowix password",
      html,
      text,
    });

    if (error) {
      console.error("[lunowix] Reset email failed:", error.message);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[lunowix] Reset email threw:", error);
    return { ok: false, reason: "failed" };
  }
}
