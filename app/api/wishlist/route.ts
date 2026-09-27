import { fail, guarded, ok, readJson, unauthorized } from "@/lib/server/http";
import { requireUser } from "@/lib/server/auth/guard";
import { wishlistMutationSchema } from "@/lib/server/validation";
import {
  addToWishlist,
  clearWishlist,
  listWishlist,
  removeFromWishlist,
} from "@/lib/server/repo/wishlist";
import { getProductById } from "@/lib/data/products";

/**
 * The signed-in wishlist.
 *
 * Returns ids, not products. The catalogue is already in the client bundle, so
 * sending full product objects would re-send data the page has and make the
 * response an order of magnitude larger for nothing.
 */
export const dynamic = "force-dynamic";

export const GET = guarded(async () => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();
  return ok({ productIds: await listWishlist(auth.user.id) });
});

export const POST = guarded(async (request: Request) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  const body = await readJson(request, wishlistMutationSchema);
  if (!body.ok) return body.response;

  /*
   * The id has to name a real product.
   *
   * Without this the wishlist is an arbitrary key-value store that any signed-in
   * account can write to, and the board would later render rows for ids that
   * resolve to nothing.
   */
  if (!getProductById(body.data.productId)) {
    return fail("No product has that id.", 404);
  }

  await addToWishlist(auth.user.id, body.data.productId);
  return ok({ productIds: await listWishlist(auth.user.id) });
});

export const DELETE = guarded(async (request: Request) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  /*
   * A DELETE with no body clears the whole list; with a `productId` it removes
   * one. `request.json()` on an empty body throws, so the empty case is detected
   * by reading the text first rather than by catching the parse.
   */
  const raw = await request.text();
  if (!raw.trim()) {
    await clearWishlist(auth.user.id);
    return ok({ productIds: [] });
  }

  const body = await readJson(
    new Request(request.url, { method: "POST", body: raw, headers: request.headers }),
    wishlistMutationSchema,
  );
  if (!body.ok) return body.response;

  await removeFromWishlist(auth.user.id, body.data.productId);
  return ok({ productIds: await listWishlist(auth.user.id) });
});
