import { cookies } from "next/headers";
import { z } from "zod";
import { fail, guarded, ok, readJson } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import { loginSchema, productIdSchema } from "@/lib/server/validation";
import { authenticate, toPublicUser } from "@/lib/server/repo/users";
import { createSession, pruneExpiredSessions } from "@/lib/server/repo/sessions";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/auth/session";
import { listWishlist, mergeWishlist } from "@/lib/server/repo/wishlist";
import { listCompareHistory } from "@/lib/server/repo/compare";

/**
 * Sign in.
 *
 * Returns the account AND its saved state in one response — wishlist ids and
 * compare history — because the client needs all three to render a signed-in
 * page and three round trips to get them would show a visibly incomplete UI in
 * between.
 */

const schema = loginSchema.extend({
  /** What this browser had saved while signed out. Merged, never replaced. */
  wishlist: z.array(productIdSchema).max(200).optional(),
});

export const POST = guarded(async (request: Request) => {
  /*
   * Ten attempts per fifteen minutes per address.
   *
   * Loose enough that someone genuinely fumbling their password is not locked
   * out, tight enough that online guessing is hopeless — and it also caps how
   * much scrypt work one caller can force, which is the real cost here at
   * ~200ms of CPU per attempt.
   */
  const limit = rateLimit(clientKey(request, "login"), 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail("Too many sign-in attempts. Try again in a few minutes.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, schema);
  if (!body.ok) return body.response;

  const user = await authenticate(body.data.email, body.data.password);

  /*
   * One message for both "no such account" and "wrong password", and the same
   * 401 for each. `authenticate` also spends the same time on both, so neither
   * the wording nor the latency says whether the address is registered.
   */
  if (!user) return fail("That email and password do not match.", 401);

  const session = await createSession(user.id, body.data.remember);

  const wishlist = body.data.wishlist?.length
    ? await mergeWishlist(user.id, body.data.wishlist)
    : await listWishlist(user.id);

  const history = await listCompareHistory(user.id);

  const store = await cookies();
  store.set(SESSION_COOKIE, session.cookieValue, cookieOptions(session.expiresAt));

  /*
   * Opportunistic housekeeping, deliberately not awaited into the response.
   * Sign-in is infrequent enough to be a sensible place to sweep dead rows, and
   * the visitor should not wait for it.
   */
  void pruneExpiredSessions().catch((error) =>
    console.error("[lunowix] Session prune failed:", error),
  );

  return ok({ user: toPublicUser(user), wishlist, compareHistory: history });
});
