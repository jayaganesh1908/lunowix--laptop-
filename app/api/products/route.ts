import { fail, guarded, ok } from "@/lib/server/http";
import {
  allProducts,
  priceCheckedFor,
  productsIn,
  searchProducts,
  sortProducts,
} from "@/lib/data/products";
import { categoryBySlug, type ProductCategory, type ProductSortOption } from "@/lib/types";

/**
 * A read-only JSON view of the catalogue.
 *
 * The site's own pages do NOT use this — they import `lib/data` directly, which
 * is what keeps 74 detail routes statically pre-rendered. This is for anything
 * outside the app: a future mobile client, a price-watching script, or someone
 * checking a figure without scraping HTML.
 *
 * Dynamic, and it has to be. This was briefly `force-static` on the reasoning
 * that the catalogue only changes at build time — which is true of the DATA and
 * false of the RESPONSE. A statically rendered route handler has no request to
 * read, so `new URL(request.url).searchParams` came back empty and every
 * `category`, `sort`, `limit` and `offset` was silently ignored: the endpoint
 * answered `?category=phone&limit=3` with 24 mixed products and a 200, and the
 * validation below never ran at all. Anything that varies by query string is
 * dynamic by definition.
 *
 * The catalogue is already in memory, so serving this per request is a filter
 * and a slice — there is nothing here worth caching at the cost of correctness.
 */
export const dynamic = "force-dynamic";

const SORTS: ProductSortOption[] = [
  "newest",
  "price-asc",
  "price-desc",
  "rating",
  "performance",
];

/** Full products are heavy — each carries specs, reviews, benchmarks and 3D params. */
const MAX_LIMIT = 100;

export const GET = guarded(async (request: Request) => {
  const params = new URL(request.url).searchParams;

  const categoryParam = params.get("category");
  if (categoryParam && !categoryBySlug.has(categoryParam as ProductCategory)) {
    return fail(
      `Unknown category. Use one of: ${[...categoryBySlug.keys()].join(", ")}.`,
      400,
    );
  }

  const sortParam = params.get("sort");
  if (sortParam && !SORTS.includes(sortParam as ProductSortOption)) {
    return fail(`Unknown sort. Use one of: ${SORTS.join(", ")}.`, 400);
  }

  const query = params.get("q")?.trim() ?? "";

  let pool = categoryParam
    ? productsIn(categoryParam as ProductCategory)
    : allProducts;

  if (query) {
    const matches = new Set(searchProducts(query).map((product) => product.id));
    pool = pool.filter((product) => matches.has(product.id));
  }

  const sorted = sortProducts(pool, (sortParam as ProductSortOption) ?? "newest");

  /*
   * Bounded, and a bad `limit` is an error rather than a silent default. Sending
   * `limit=abc` and receiving 24 rows is the kind of thing that gets debugged
   * for an hour.
   */
  const limitParam = params.get("limit");
  let limit = 24;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return fail(`limit must be a whole number from 1 to ${MAX_LIMIT}.`, 400);
    }
    limit = parsed;
  }

  const offsetParam = params.get("offset");
  let offset = 0;
  if (offsetParam !== null) {
    const parsed = Number(offsetParam);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return fail("offset must be a whole number of 0 or more.", 400);
    }
    offset = parsed;
  }

  const page = sorted.slice(offset, offset + limit);

  return ok({
    total: sorted.length,
    offset,
    limit,
    products: page.map((product) => ({
      id: product.id,
      category: product.category,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      priceCheckedAt: priceCheckedFor(product),
      rating: product.rating,
      reviews: product.reviews,
      overall: product.performance.overall,
      image: product.image,
      inStock: product.inStock,
      releaseYear: product.releaseYear,
      href: `/${categoryBySlug.get(product.category)!.route}/${product.id}`,
    })),
  });
});
