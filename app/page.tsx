import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { BudgetCategories } from "@/components/home/BudgetCategories";
import { FeaturedLaptops } from "@/components/home/FeaturedLaptops";
import { ScrollShowcase, type ShowcaseRow } from "@/components/home/ScrollShowcase";
import { WhyChoose } from "@/components/home/WhyChoose";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { featuredAcrossCategories } from "@/lib/data/products";
import { laptops } from "@/lib/data/laptops";
import { productHref } from "@/lib/types";
import { formatBattery, formatPrice, formatWeight } from "@/lib/utils/formatters";

export const metadata: Metadata = {
  title: "Find Your Perfect Electronics",
  description:
    "Browse laptops, phones and headphones by budget, compare specs side by side, and check real performance before you buy.",
  alternates: { canonical: "/" },
};

/**
 * The pair shown in the scroll card, picked from the catalogue rather than
 * pinned by id: two bestsellers close enough in price that the comparison is a
 * real decision, sorted so the choice is stable between builds.
 */
function showcasePair() {
  const candidates = laptops
    .filter((laptop) => laptop.bestseller)
    .sort((a, b) => b.performance.overall - a.performance.overall);

  return [candidates[0] ?? laptops[0], candidates[1] ?? laptops[1]] as const;
}

export default async function HomePage() {
  /* Two bestsellers per category rather than the top eight laptops. The site
     covers three categories; a home page that only ever shows laptops tells a
     visitor the other two are an afterthought. */
  const featured = featuredAcrossCategories;

  const [left, right] = showcasePair();

  /* Formatted here, in the server component, so the catalogue never reaches the
     client bundle for the sake of four rows. `winner` follows the same rule as
     the real comparison table: lower is better for price and weight, higher for
     everything else, and -1 marks a tie. */
  const pick = (a: number, b: number, lowerWins = false) => {
    if (a === b) return -1;
    const leftWins = lowerWins ? a < b : a > b;
    return leftWins ? 0 : 1;
  };

  const rows: ShowcaseRow[] = [
    {
      label: "Price",
      values: [formatPrice(left.price), formatPrice(right.price)],
      winner: pick(left.price, right.price, true),
    },
    {
      label: "Gaming",
      values: [`${left.performance.gaming}`, `${right.performance.gaming}`],
      winner: pick(left.performance.gaming, right.performance.gaming),
    },
    {
      label: "Battery",
      values: [formatBattery(left.specs.battery), formatBattery(right.specs.battery)],
      winner: pick(left.specs.battery, right.specs.battery),
    },
    {
      label: "Weight",
      values: [formatWeight(left.specs.weight), formatWeight(right.specs.weight)],
      winner: pick(left.specs.weight, right.specs.weight, true),
    },
  ];

  return (
    <>
      <Hero />
      <ScrollShowcase
        products={[
          {
            name: left.name,
            brand: left.brand,
            image: left.image,
            href: productHref(left),
          },
          {
            name: right.name,
            brand: right.brand,
            image: right.image,
            href: productHref(right),
          },
        ]}
        rows={rows}
        compareHref={`/compare?a=${left.id}&b=${right.id}`}
      />
      <BudgetCategories />
      <FeaturedLaptops laptops={featured} />
      <WhyChoose />
      <NewsletterSection />
    </>
  );
}
