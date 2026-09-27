import { fail, guarded, ok, readJson } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";
import { newsletterSchema } from "@/lib/server/validation";
import { subscribe, unsubscribe } from "@/lib/server/repo/newsletter";

/**
 * Newsletter sign-up.
 *
 * The form used to run a 700ms timer and then say "You're on the list", which
 * nobody was. This stores the address.
 *
 * Public and unauthenticated, so it is rate limited per address: an open write
 * endpoint is otherwise a free way to fill the table.
 */
export const POST = guarded(async (request: Request) => {
  const limit = rateLimit(clientKey(request, "newsletter"), 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail("Too many sign-ups from here. Try again later.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, newsletterSchema);
  if (!body.ok) return body.response;

  const result = await subscribe(body.data.email, body.data.source ?? "home");

  /*
   * The same 200 whether the address was new or already subscribed.
   *
   * Distinguishing them would turn this into a way to test whether an address is
   * on the list, which is not something a stranger should be able to ask. The
   * visitor sees "you're on the list" either way, which is true either way.
   */
  return ok({ subscribed: true, created: result.created });
});

export const DELETE = guarded(async (request: Request) => {
  const body = await readJson(request, newsletterSchema.pick({ email: true }));
  if (!body.ok) return body.response;

  await unsubscribe(body.data.email);

  // Again uniform: never reveal whether the address was on the list.
  return ok({ unsubscribed: true });
});
