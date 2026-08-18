import type { MetadataRoute } from "next";
import { allProducts } from "@/lib/data/products";
import { budgetBands } from "@/lib/data/laptops";
import { categories, productHref } from "@/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/*
 * Derived from the catalogue, never written out by hand.
 *
 * A hardcoded list of URLs is wrong the first time a product is added, and
 * nobody notices because a sitemap has no visible failure mode. Everything
 * here comes from the same modules the pages render from, so a new product or
 * a new category appears in the sitemap the moment it exists.
 *
 * `/admin` is excluded on purpose — it already carries `robots: noindex`, and
 * listing a page you have asked not to be indexed is a contradiction. Auth
 * routes are excluded for the same reason: nothing to rank, and a sign-in form
 * in search results helps no one.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteUrl}${path}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/products"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/compare"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/wishlist"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: url("/contact"), changeFrequency: "yearly", priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: url(`/${category.route}`),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  /* The budget landing pages are real, indexable entry points — "laptops under
     ₹40,000" is the query people actually type. */
  const budgetRoutes: MetadataRoute.Sitemap = budgetBands.map((band) => ({
    url: url(`/laptops?budget=${band.slug}`),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productRoutes: MetadataRoute.Sitemap = allProducts.map((product) => ({
    url: url(productHref(product)),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...budgetRoutes, ...productRoutes];
}
