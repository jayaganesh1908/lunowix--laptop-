import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { BudgetCategories } from "@/components/home/BudgetCategories";
import { FeaturedLaptops } from "@/components/home/FeaturedLaptops";
import { WhyChoose } from "@/components/home/WhyChoose";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { featuredAcrossCategories } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Find Your Perfect Electronics",
  description:
    "Browse laptops, phones and headphones by budget, compare specs side by side, and check real performance before you buy.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  /* Two bestsellers per category rather than the top eight laptops. The site
     covers three categories; a home page that only ever shows laptops tells a
     visitor the other two are an afterthought. */
  const featured = featuredAcrossCategories;

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
