import { cookies } from "next/headers";
import { guarded, ok } from "@/lib/server/http";
import { currentSessionId } from "@/lib/server/auth/guard";
import { destroySession } from "@/lib/server/repo/sessions";
import { SESSION_COOKIE, clearedCookieOptions } from "@/lib/server/auth/session";

/**
 * Sign out.
 *
 * POST, not GET: a GET would let `<img src="/api/auth/logout">` on any page sign
 * the visitor out, and `sameSite: "lax"` does not stop a cross-site GET.
 *
 * The session row is DELETED, not just the cookie cleared. Clearing only the
 * cookie leaves a token that still authenticates anywhere it was copied to.
 *
 * Always 200, even with no session: "you are signed out" is true either way, and
 * a 401 here would only make the client handle a non-problem.
 */
export const POST = guarded(async () => {
  const id = await currentSessionId();
  if (id) await destroySession(id);

  const store = await cookies();
  store.set(SESSION_COOKIE, "", clearedCookieOptions());

  return ok({ ok: true });
});
