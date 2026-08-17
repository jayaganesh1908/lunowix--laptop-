"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
/* Generic card: the section spans every category now, and `LaptopCard` is
   typed to `Laptop`. */
import { ProductCard } from "@/components/products";
import { SectionHeading } from "@/components/common/SectionHeading";
import { buttonStyles } from "@/components/common/buttonStyles";
import type { Product } from "@/lib/types";
import { inView, staggerContainer } from "@/lib/utils/animations";

export function FeaturedLaptops({ laptops }: { laptops: Product[] }) {
  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <SectionHeading
        align="left"
        eyebrow="Reader favourites"
        title={<span id="featured-heading">Featured picks</span>}
        description="The laptops, phones and headphones people compare, save and buy most often this quarter."
        action={
          <Link href="/products" className={buttonStyles({ variant: "outline" })}>
            Browse everything
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <motion.div
        variants={staggerContainer}
        {...inView}
        className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        {laptops.map((laptop) => (
          <ProductCard key={laptop.id} product={laptop} />
        ))}
      </motion.div>
    </section>
  );
}
