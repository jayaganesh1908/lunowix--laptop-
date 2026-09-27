import { guarded, ok, readJson, unauthorized } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth/guard";
import { wishlistMergeSchema } from "@/lib/server/validation";
import { mergeWishlist } from "@/lib/server/repo/wishlist";
import { getProductById } from "@/lib/data/products";

/**
 * Folds this browser's saved ids into the account's.
 *
 * The login and register routes already do this with the ids the client sends
 * them, so this endpoint is for the case they cannot cover: a session restored
 * from a cookie on a browser that has since saved things while signed out.
 *
 * Unknown ids are dropped silently rather than failing the whole merge. The
 * input comes from localStorage, which can hold an id from a product that has
 * since left the catalogue — losing the merge over one stale entry would be a
 * worse outcome than quietly skipping it.
 */
export const POST = guarded(async (request: Request) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  const body = await readJson(request, wishlistMergeSchema);
  if (!body.ok) return body.response;

  const known = body.data.productIds.filter((id) => getProductById(id));
  const merged = await mergeWishlist(auth.user.id, known);

  return ok({ productIds: merged, skipped: body.data.productIds.length - known.length });
});
