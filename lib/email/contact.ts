import "server-only";

import { Resend } from "resend";

import { apiKey, contactMailConfigured, contactToAddress, fromAddress } from "./config";

const client = () => new Resend(apiKey());

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/*
 * The message arrives as an email to the team, with the sender's address on
 * `replyTo` rather than `from`. Putting a visitor-supplied address in `from`
 * is what gets a domain's mail flagged as spoofed — the envelope has to stay
 * on a domain the site is authorised to send from.
 *
 * Every field is escaped before it reaches the HTML body. The values come from
 * a public form, so they are treated as text, not markup.
 */
export async function sendContactMessage(
  input: ContactMessage,
): Promise<{ ok: true } | { ok: false; reason: "unconfigured" | "failed" }> {
  if (!contactMailConfigured()) {
    console.warn(
      "[lunowix] RESEND_API_KEY or CONTACT_TO_EMAIL not set — contact message not delivered.",
    );
    return { ok: false, reason: "unconfigured" };
  }

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr><td style="padding:0 0 12px;font-size:13px;letter-spacing:3px;color:#ff6b00;font-weight:700;">LUNOWIX · CONTACT</td></tr>
  <tr><td style="padding:0 0 4px;font-size:20px;font-weight:700;">${escapeHtml(input.subject)}</td></tr>
  <tr><td style="padding:0 0 16px;font-size:14px;color:#666;">
    From ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;
  </td></tr>
  <tr><td style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(input.message)}</td></tr>
</table>`.trim();

  const text = `${input.subject}\nFrom ${input.name} <${input.email}>\n\n${input.message}`;

  try {
    const { error } = await client().emails.send({
      from: fromAddress(),
      to: contactToAddress(),
      replyTo: input.email,
      subject: `[Contact] ${input.subject}`,
      html,
      text,
    });

    if (error) {
      console.error("[lunowix] Contact email failed:", error.message);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[lunowix] Contact email threw:", error);
    return { ok: false, reason: "failed" };
  }
}
