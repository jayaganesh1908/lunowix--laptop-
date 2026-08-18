import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * `/admin` and `/auth` are disallowed rather than merely `noindex`-ed: there is
 * nothing there for a crawler to spend a budget on, and the admin view enumerates
 * the whole catalogue in one page.
 *
 * `/search` is disallowed because a query-string search page generates unbounded
 * near-duplicate URLs, which is the classic way a small catalogue site burns its
 * crawl budget on itself.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth/", "/search"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
