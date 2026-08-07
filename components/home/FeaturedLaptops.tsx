"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LaptopCard } from "@/components/laptops/LaptopCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { buttonStyles } from "@/components/common/buttonStyles";
import type { Laptop } from "@/lib/types/laptop";
import { inView, staggerContainer } from "@/lib/utils/animations";

export function FeaturedLaptops({ laptops }: { laptops: Laptop[] }) {
  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <SectionHeading
        align="left"
        eyebrow="Reader favourites"
        title={<span id="featured-heading">Featured laptops</span>}
        description="The machines people compare, save and buy most often this quarter."
        action={
          <Link href="/laptops" className={buttonStyles({ variant: "outline" })}>
            View all laptops
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
          <LaptopCard key={laptop.id} laptop={laptop} />
        ))}
      </motion.div>
    </section>
  );
}
