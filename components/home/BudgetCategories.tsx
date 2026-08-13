"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, IndianRupee } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { budgetBands, laptopsInBand } from "@/lib/data/laptops";
import { fadeUp, inView, staggerContainer } from "@/lib/utils/animations";
import { formatPriceShort } from "@/lib/utils/formatters";

export function BudgetCategories() {
  return (
    <section
      id="budgets"
      aria-labelledby="budgets-heading"
      className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <SectionHeading
        eyebrow="Start with the number that matters"
        title={<span id="budgets-heading">Shop by budget</span>}
        description="Every band below is a real slice of the catalogue — pick one and the listing page opens pre-filtered."
      />

      <motion.div
        variants={staggerContainer}
        {...inView}
        className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {budgetBands.map((band) => {
          const matches = laptopsInBand(band);
          const cheapest = matches.length
            ? Math.min(...matches.map((laptop) => laptop.price))
            : 0;

          return (
            <motion.div key={band.slug} variants={fadeUp}>
              <Link
                href={`/laptops?budget=${band.slug}`}
                className="card-surface group relative flex h-full flex-col overflow-hidden p-6 transition-shadow hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-brand-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <IndianRupee className="size-5" aria-hidden />
                  </span>
                  <ArrowUpRight
                    className="size-5 text-ink-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-ink-600"
                    aria-hidden
                  />
                </div>

                <h3 className="relative mt-5 text-lg font-semibold tracking-tight">
                  {band.label}
                </h3>
                <p className="relative mt-1.5 text-sm text-ink-600 dark:text-ink-300">
                  {band.description}
                </p>

                <div className="relative mt-5 flex items-center gap-3 border-t border-ink-900/5 pt-4 text-xs dark:border-white/10">
                  <span className="font-semibold text-brand-700 dark:text-brand-400">
                    {matches.length} {matches.length === 1 ? "laptop" : "laptops"}
                  </span>
                  {matches.length ? (
                    <span className="text-ink-500 dark:text-ink-400">
                      from {formatPriceShort(cheapest)}
                    </span>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
