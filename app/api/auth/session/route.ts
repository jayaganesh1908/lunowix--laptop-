import { guarded, ok } from "@/lib/server/http";
import { currentUser } from "@/lib/server/auth/guard";
import { toPublicUser } from "@/lib/server/repo/users";
import { listWishlist } from "@/lib/server/repo/wishlist";
import { listCompareHistory } from "@/lib/server/repo/compare";

/**
 * Who is signed in, if anyone.
 *
 * The client calls this once on mount to find out. `user: null` with a 200 is
 * the answer for a signed-out visitor — not a 401, because "nobody is signed in"
 * is a successful answer to this question, and a 401 would have every client
 * treating an ordinary anonymous visit as an error.
 *
 * `force-dynamic` because the response depends on a cookie. Without it Next can
 * treat the route as static and serve one visitor's session to the next.
 */
export const dynamic = "force-dynamic";

export const GET = guarded(async () => {
  const user = await currentUser();
  if (!user) return ok({ user: null, wishlist: [], compareHistory: [] });

  return ok({
    user: toPublicUser(user),
    wishlist: await listWishlist(user.id),
    compareHistory: await listCompareHistory(user.id),
  });
});
