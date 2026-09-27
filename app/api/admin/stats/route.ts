import { forbidden, guarded, ok, unauthorized } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/auth/guard";
import { collectStats } from "@/lib/server/stats";

/**
 * Dashboard figures. Admin only.
 *
 * The distinction between 401 and 403 matters to the client: unauthenticated
 * means "sign in and this may work", forbidden means "signed in, but this
 * account will never be allowed" — and the admin page shows different copy for
 * each rather than sending a member to a login form they have already used.
 */
export const dynamic = "force-dynamic";

export const GET = guarded(async () => {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.reason === "forbidden" ? forbidden() : unauthorized();

  return ok(await collectStats());
});
