import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/Display";
import { ProductBrowser } from "@/components/products";
import { allProducts, productsInBand } from "@/lib/data/products";
import { getBudgetBand } from "@/lib/data/laptops";

export const metadata: Metadata = {
  title: "Everything",
  description:
    "Every laptop, phone and pair of headphones in the Lunowix catalogue, filterable by brand, price and performance.",
  alternates: { canonical: "/products" },
};

/**
 * The all-category listing.
 *
 * The site had three per-category routes and nothing that spanned them, so
 * anything meaning "everything" — the home page's budget bands, the featured
 * section's call to action — had to point at `/laptops` and quietly narrow to
 * one third of the catalogue.
 *
 * The band filter is applied HERE rather than inside `ProductBrowser`, because
 * the browser takes the pool it is given. Filtering server-side keeps it free
 * of route concerns and means the band's own bounds are the single definition.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ budget?: string }>;
}) {
  const { budget } = await searchParams;
  const band = budget ? getBudgetBand(budget) : undefined;
  const products = band ? productsInBand(band) : allProducts;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        align="left"
        eyebrow={band ? "Shop by budget" : "The whole catalogue"}
        title={band ? band.label : "Everything"}
        description={
          band
            ? `${products.length} ${products.length === 1 ? "product" : "products"} in this band, across laptops, phones and headphones.`
            : "Every laptop, phone and pair of headphones, filterable by brand, price and performance."
        }
      />
      <ProductBrowser products={products} className="mt-8" />
    </div>
  );
}
