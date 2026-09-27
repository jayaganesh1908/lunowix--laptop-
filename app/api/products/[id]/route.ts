import { guarded, notFound, ok } from "@/lib/server/http";
import { getProductById, priceCheckedFor } from "@/lib/data/products";
import { listReviews, summarise, toReview } from "@/lib/server/repo/reviews";
import { recordView } from "@/lib/server/repo/views";

/**
 * One product in full, plus whatever reviews people have written for it.
 *
 * Dynamic, unlike the list route, because the review data is live and because
 * requesting a product is what records a view.
 */
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = guarded(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const product = getProductById(id);
  if (!product) return notFound("That product");

  /*
   * Counted, but not waited for. A view is a side effect of reading, and a
   * failed counter write must not turn a successful read into a 500.
   */
  void recordView(product.id).catch((error) =>
    console.error("[lunowix] View counter failed:", error),
  );

  const stored = await listReviews(product.id);

  return ok({
    product: { ...product, priceCheckedAt: priceCheckedFor(product) },
    reviews: stored.map(toReview),
    reviewSummary: await summarise(product.id),
  });
});
