import { fail, guarded, notFound, ok, readJson, unauthorized } from "@/lib/server/http";
import { currentUser, requireUser } from "@/lib/server/auth/guard";
import { productIdSchema, reviewSchema } from "@/lib/server/validation";
import {
  deleteReview,
  findUserReview,
  listReviews,
  submitReview,
  summarise,
  toReview,
} from "@/lib/server/repo/reviews";
import { getProductById } from "@/lib/data/products";
import { rateLimit } from "@/lib/server/rateLimit";

/**
 * Reviews for one product.
 *
 * These are the stored, account-backed ones only. The generated samples in
 * `lib/data` are what the statically rendered detail page ships with; the client
 * fetches this and shows real reviews above them. Mixing the two here would make
 * it impossible for the page to tell them apart, and the samples are not
 * something anyone should be able to delete.
 */
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ productId: string }>;
}

export const GET = guarded(async (_request: Request, { params }: Params) => {
  const { productId } = await params;

  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return fail("That is not a valid product id.", 400);
  if (!getProductById(parsed.data)) return notFound("That product");

  const rows = await listReviews(parsed.data);

  /*
   * `mine` lets the page show "edit your review" instead of a blank form. It is
   * the caller's OWN review, resolved from their session — never another
   * account's, and the response carries no user ids.
   */
  const user = await currentUser();
  const mine = user ? rows.find((row) => row.userId === user.id) : undefined;

  return ok({
    reviews: rows.map(toReview),
    summary: await summarise(parsed.data),
    mine: mine ? toReview(mine) : null,
  });
});

export const POST = guarded(async (request: Request, { params }: Params) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  const { productId } = await params;
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return fail("That is not a valid product id.", 400);
  if (!getProductById(parsed.data)) return notFound("That product");

  // Keyed by account, not address: a review is a write only a signed-in person
  // can make, so the account is the honest subject of the limit.
  const limit = rateLimit(`review:${auth.user.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return fail("You have posted a lot of reviews just now. Try again later.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await readJson(request, reviewSchema);
  if (!body.ok) return body.response;

  const existing = await findUserReview(parsed.data, auth.user.id);

  const stored = await submitReview({
    productId: parsed.data,
    userId: auth.user.id,
    author: auth.user.name,
    ...body.data,
  });

  return ok(
    { review: toReview(stored), summary: await summarise(parsed.data) },
    existing ? 200 : 201,
  );
});

export const DELETE = guarded(async (_request: Request, { params }: Params) => {
  const auth = await requireUser();
  if (!auth.ok) return unauthorized();

  const { productId } = await params;
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return fail("That is not a valid product id.", 400);

  const mine = await findUserReview(parsed.data, auth.user.id);
  if (!mine) return notFound("Your review");

  // `deleteReview` re-checks ownership, so this cannot delete anyone else's.
  await deleteReview(mine.id, auth.user.id);

  return ok({ summary: await summarise(parsed.data) });
});
