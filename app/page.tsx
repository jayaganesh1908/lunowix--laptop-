import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { BudgetCategories } from "@/components/home/BudgetCategories";
import { FeaturedLaptops } from "@/components/home/FeaturedLaptops";
import { WhyChoose } from "@/components/home/WhyChoose";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { getLaptops } from "@/lib/db/catalogue";

export const metadata: Metadata = {
  title: "Find Your Perfect Laptop",
  description:
    "Browse by budget, compare specs, discover gaming performance, software compatibility, and find your ideal laptop.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const catalogue = await getLaptops();
  const featured = catalogue
    .filter((laptop) => laptop.bestseller)
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return (
    <>
      <Hero />
      <BudgetCategories />
      <FeaturedLaptops laptops={featured} />
      <WhyChoose />
      <NewsletterSection />
    </>
  );
}
