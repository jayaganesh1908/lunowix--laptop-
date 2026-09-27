import { z } from "zod";
import { fail, guarded, ok, readJson } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import { emailSchema } from "@/lib/server/validation";
import { findUserByEmail } from "@/lib/server/repo/users";
import { createResetToken } from "@/lib/server/repo/passwordResets";
import { sendPasswordResetEmail } from "@/lib/email/reset";

/**
 * Requests a password reset link.
 *
 * Deliberately always answers the same way for a known and an unknown address.
 * This endpoint is unauthenticated, so distinguishing them turns it into an
 * account-enumeration oracle: anyone could test a list of addresses against the
 * site. The visitor is told to check their inbox either way, which is the only
 * honest thing that can be said without revealing whether the account exists.
 *
 * The exception is a deployment with no mail configured. Silently claiming a
 * link was sent would be a lie to EVERY visitor, not a privacy measure, so a
 * 501 is returned — the same distinction the contact form makes.
 */
const schema = z.object({ email: emailSchema });

export const POST = guarded(async (request: Request) => {
  /*
   * Tight, because each allowed request sends an email. An unmetered endpoint
   * that sends mail is a way to use the site to spam a third party, and a fast
   * way to burn a free tier's daily send quota.
   */
  const limit = rateLimit(clientKey(request, "forgot"), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail("Too many reset requests. Try again later.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, schema);
  if (!body.ok) return body.response;

  const user = await findUserByEmail(body.data.email);

  if (!user) {
    /*
     * No account. Spend nothing, reveal nothing, and return the same shape as
     * success. `mailConfigured` is reported from the environment rather than
     * from an attempted send, so the answer does not depend on the address.
     */
    return ok({ sent: true, mailConfigured: Boolean(process.env.RESEND_API_KEY) });
  }

  const token = await createResetToken(user.id);

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const resetUrl = `${origin.replace(/\/$/, "")}/auth/reset-password?token=${token}`;

  const result = await sendPasswordResetEmail(user.displayEmail, resetUrl);

  if (!result.ok && result.reason === "unconfigured") {
    return fail(
      "Password reset email is not configured on this deployment. Set RESEND_API_KEY.",
      501,
    );
  }

  if (!result.ok) {
    return fail("The reset email could not be sent. Please try again.", 502);
  }

  return ok({ sent: true, mailConfigured: true });
});
