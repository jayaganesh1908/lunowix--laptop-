import { cookies } from "next/headers";
import { z } from "zod";
import { fail, guarded, ok, readJson } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import { productIdSchema, registerSchema } from "@/lib/server/validation";
import { createUser, toPublicUser } from "@/lib/server/repo/users";
import { createSession } from "@/lib/server/repo/sessions";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth/session";
import { mergeWishlist } from "@/lib/server/repo/wishlist";

/**
 * Create an account, and sign in with it.
 *
 * Registering then being shown a login form is a pointless step — the
 * credential was just proven — so a successful registration sets the session
 * cookie immediately.
 *
 * `wishlist` is optional and carries whatever the browser had saved before the
 * account existed, so the first thing the new account owns is the work already
 * done. Same merge the login route runs; see `mergeWishlist`.
 */

const schema = registerSchema.extend({
  wishlist: z.array(productIdSchema).max(200).optional(),
});

export const POST = guarded(async (request: Request) => {
  // Tighter than login: an account is a write, and this is the endpoint a bot
  // would use to fill the table.
  const limit = rateLimit(clientKey(request, "register"), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail("Too many accounts from this address. Try again later.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, schema);
  if (!body.ok) return body.response;

  const created = await createUser(body.data);

  /*
   * Deliberately explicit that the address is taken.
   *
   * The alternative — "check your email", revealing nothing — only helps if the
   * app then sends a mail that quietly says "you already have an account", and
   * there is no mail on this path. Without that, hiding it just leaves someone
   * unable to work out why they cannot register, while an attacker learns the
   * same fact from the login form's timing anyway.
   */
  if (!created.ok) {
    return fail("An account with that email already exists. Try signing in.", 409);
  }

  const session = await createSession(created.user.id, true);

  const wishlist = body.data.wishlist?.length
    ? await mergeWishlist(created.user.id, body.data.wishlist)
    : [];

  const store = await cookies();
  store.set(SESSION_COOKIE, session.cookieValue, cookieOptions(session.expiresAt));

  return ok({ user: toPublicUser(created.user), wishlist }, 201);
});
