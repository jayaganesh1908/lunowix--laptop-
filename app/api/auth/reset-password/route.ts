import { z } from "zod";
import { cookies } from "next/headers";
import { fail, guarded, ok, readJson } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import { passwordSchema } from "@/lib/server/validation";
import { consumeResetToken } from "@/lib/server/repo/passwordResets";
import { findUserById, toPublicUser, updatePassword } from "@/lib/server/repo/users";
import { createSession, destroyUserSessions } from "@/lib/server/repo/sessions";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth/session";

/**
 * Consumes a reset token and sets a new password.
 */
const schema = z.object({
  token: z.string().min(16).max(200),
  password: passwordSchema,
});

export const POST = guarded(async (request: Request) => {
  // Bounded so a token cannot be brute-forced through this endpoint. 32 bytes of
  // entropy makes that hopeless anyway; this caps the cost of trying.
  const limit = rateLimit(clientKey(request, "reset"), 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail("Too many attempts. Try again in a few minutes.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, schema);
  if (!body.ok) return body.response;

  const userId = await consumeResetToken(body.data.token);
  if (!userId) {
    return fail("That reset link is invalid or has expired. Request a new one.", 400);
  }

  const updated = await updatePassword(userId, body.data.password);
  if (!updated) return fail("That account no longer exists.", 404);

  /*
   * Every existing session is destroyed.
   *
   * A password reset is what someone does when they believe the account is
   * compromised. Leaving the intruder's session alive would make the reset
   * cosmetic — it has to log everyone out, including the person doing it.
   */
  await destroyUserSessions(userId);

  const user = await findUserById(userId);
  if (!user) return fail("That account no longer exists.", 404);

  // Then sign THIS browser back in, so the reset ends somewhere useful.
  const session = await createSession(user.id, false);
  const store = await cookies();
  store.set(SESSION_COOKIE, session.cookieValue, cookieOptions(session.expiresAt));

  return ok({ user: toPublicUser(user) });
});
