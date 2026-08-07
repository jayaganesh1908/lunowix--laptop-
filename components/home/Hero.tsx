"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, Sparkles } from "lucide-react";
import { buttonStyles } from "@/components/common/buttonStyles";
import { DecryptText } from "@/components/ui/decrypt-text";
import { HandWrittenTitle } from "@/components/ui/hand-writing-text";
import { laptops } from "@/lib/data/laptops";
import { games } from "@/lib/data/games";
import { softwareCatalog } from "@/lib/data/software";
import { fadeUp, staggerContainer } from "@/lib/utils/animations";

const STATS = [
  { value: `${laptops.length}`, label: "Laptops profiled" },
  { value: `${games.length}`, label: "Games benchmarked" },
  { value: `${softwareCatalog.length}`, label: "Apps checked" },
  { value: "7", label: "Brands covered" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-14rem] size-[38rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px] animate-[drift_22s_linear_infinite]" />
        <div className="absolute -left-40 top-40 size-[26rem] rounded-full bg-brand-400/10 blur-[100px]" />
        <div className="absolute -right-32 top-24 size-[30rem] rounded-full bg-brand-600/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,0,0.08),transparent_60%)]" />
      </div>

      {/* The particle field now lives in the root layout as a fixed, site-wide
          layer — see components/layout/BackgroundParticles.tsx. */}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pb-24 lg:pt-28"
      >
        <motion.p
          variants={fadeUp}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Specs are only half the story
        </motion.p>

        {/* Not wrapped in a `fadeUp` motion child: the title runs its own
            draw-then-fade choreography, and stacking the stagger transform on
            top of it fights the entrance. */}
        <HandWrittenTitle
          as="h1"
          stretch
          className="mt-2 max-w-3xl py-16 sm:py-20"
          titleClassName="block text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          strokeClassName="text-brand-500/55 dark:text-brand-500/45"
        >
          <DecryptText
            segments={[
              { text: "Find", decrypt: true },
              { text: " Your Perfect " },
              { text: "Laptop", decrypt: true },
            ]}
          />
        </HandWrittenTitle>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg dark:text-ink-300"
        >
          Browse by budget, compare specs, discover gaming performance, software
          compatibility, and find your ideal laptop.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/laptops"
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Explore Laptops
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/compare"
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            <GitCompareArrows className="size-4" aria-hidden />
            Compare Now
          </Link>
        </motion.div>

        <motion.dl
          variants={fadeUp}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl px-4 py-5 text-center"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-mono text-2xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
