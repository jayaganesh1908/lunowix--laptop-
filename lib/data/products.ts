import { laptops, searchLaptops } from "./laptops";
import { phones, searchPhones } from "./phones";
import { headphones, searchHeadphones } from "./headphones";
import { type Product, type ProductCategory, type ProductSortOption } from "@/lib/types";

/**
 * The cross-category registry.
 *
 * Anything that holds a bare product id — the wishlist, the compare tray, the
 * global search — needs to resolve it without knowing which catalogue it came
 * from. Ids are unique across all three, so one map is enough.
 */

export const allProducts: Product[] = [...laptops, ...phones, ...headphones];

export const productsById = new Map<string, Product>(
  allProducts.map((product) => [product.id, product]),
);

export function getProductById(id: string): Product | undefined {
  return productsById.get(id);
}

/** Resolves ids to products, preserving the order given and dropping unknowns. */
export function getProductsByIds(ids: string[]): Product[] {
  return ids
    .map((id) => productsById.get(id))
    .filter((product): product is Product => Boolean(product));
}

export function productsIn(category: ProductCategory): Product[] {
  switch (category) {
    case "laptop":
      return laptops;
    case "phone":
      return phones;
    case "headphone":
      return headphones;
  }
}

export const productCounts: Record<ProductCategory, number> = {
  laptop: laptops.length,
  phone: phones.length,
  headphone: headphones.length,
};

/**
 * Global search.
 *
 * Delegates to each catalogue's own haystack rather than building a fourth one,
 * so the per-category rules about which games and use cases are worth indexing
 * keep applying — a search for "Genshin" still means "which of these run it".
 */
export function searchProducts(query: string): Product[] {
  const needle = query.trim();
  if (!needle) return [];

  return [
    ...searchLaptops(needle),
    ...searchPhones(needle),
    ...searchHeadphones(needle),
  ];
}

export function sortProducts(pool: Product[], sort: ProductSortOption): Product[] {
  const sorted = [...pool];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "performance":
      return sorted.sort((a, b) => b.performance.overall - a.performance.overall);
    case "newest":
    default:
      return sorted.sort((a, b) => b.releaseYear - a.releaseYear || b.views - a.views);
  }
}

/** The strongest bestseller from each category, for the home page. */
export const featuredAcrossCategories: Product[] = (
  ["laptop", "phone", "headphone"] as ProductCategory[]
).flatMap((category) =>
  productsIn(category)
    .filter((product) => product.bestseller)
    .sort((a, b) => b.performance.overall - a.performance.overall)
    .slice(0, 2),
);

export const trendingProducts: Product[] = [...allProducts]
  .sort((a, b) => b.views - a.views)
  .slice(0, 8);
