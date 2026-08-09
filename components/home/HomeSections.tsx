"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Columns3,
  Gamepad2,
  GitCompareArrows,
  IndianRupee,
  Mail,
  MessageSquareQuote,
  Sparkles,
  TerminalSquare,
  TrendingUp,
} from "lucide-react";
import { useId, useState } from "react";
import { Button, FeatureCard } from "@/components/common";
import { SectionHeading, buttonStyles } from "@/components/common/Display";
import { LaptopCard } from "@/components/laptops";
import { useToast } from "@/components/providers";
import { DecryptText, HandWrittenTitle } from "@/components/ui/TextEffects";
import { games } from "@/lib/data";
import { headphones } from "@/lib/data/headphones";
import { budgetBands, laptops, laptopsInBand } from "@/lib/data/laptops";
import { phones } from "@/lib/data/phones";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { type Laptop } from "@/lib/types";
import { fadeUp, inView, staggerContainer, formatPriceShort } from "@/lib/utils";

/** three.js touches `window` on import, so the hero scene is client-only. */
const HeroScene = dynamic(() => import("@/components/three/Scenes").then((mod) => mod.HeroScene), { ssr: false });

const STATS = [
  { value: `${laptops.length}`, label: "Laptops profiled" },
  { value: `${phones.length}`, label: "Phones profiled" },
  { value: `${headphones.length}`, label: "Headphones rated" },
  { value: `${games.length}`, label: "Games benchmarked" },
];

/**
 * One real product per category, picked by score rather than hand-listed, so
 * the hero can never drift out of sync with the catalogue.
 */
const HERO_MODELS = [
  laptops,
  phones,
  headphones,
].map(
  (catalogue) =>
    [...catalogue].sort((a, b) => b.performance.overall - a.performance.overall)[0].model3d,
);

export function Hero() {
  const reducedMotion = usePrefersReducedMotion();

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
              { text: "Tech", decrypt: true },
            ]}
          />
        </HandWrittenTitle>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg dark:text-ink-300"
        >
          Laptops, phones and headphones — ranked on what you actually do with them.
          Every score is derived from the specification, and you can turn all of it
          over in 3D before you decide.
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

        {/* The 3D showpiece sits below the headline so the LCP element stays
            real text — the canvas never blocks first paint or indexing. */}
        <motion.div
          variants={fadeUp}
          className="mx-auto mt-12 h-[280px] w-full max-w-4xl sm:h-[360px]"
        >
          <HeroScene items={HERO_MODELS} reducedMotion={reducedMotion} />
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
                className="card-surface group relative flex h-full flex-col overflow-hidden p-6 transition-shadow hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(255,107,0,0.25),0_24px_56px_-24px_rgba(255,107,0,0.5)]"
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

export function WhyChoose() {
  return (
    <section
      aria-labelledby="why-heading"
      className="relative overflow-hidden py-16 lg:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.08),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Lunowix"
          title={<span id="why-heading">Built around how you actually use a laptop</span>}
          description="Clock speeds do not tell you whether Android Studio will crawl or whether Cyberpunk will hold 60fps. These will."
        />

        <motion.div
          variants={staggerContainer}
          {...inView}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <IndianRupee className="size-5" aria-hidden />,
    title: "Budget recommendations",
    description:
      "Six price bands mapped to the whole catalogue, so you start from what you can spend rather than a spec sheet.",
  },
  {
    icon: <Gamepad2 className="size-5" aria-hidden />,
    title: "Gaming performance",
    description:
      "Estimated frame rates and the preset that gets you there, for ten of the titles people actually play.",
  },
  {
    icon: <TerminalSquare className="size-5" aria-hidden />,
    title: "Software compatibility",
    description:
      "Android Studio, Premiere Pro, Blender and more — each rated against the machine's real CPU, GPU and memory headroom.",
  },
  {
    icon: <Columns3 className="size-5" aria-hidden />,
    title: "Side-by-side comparison",
    description:
      "Two laptops, one table, with the stronger figure in every row highlighted so the trade-offs are obvious.",
  },
  {
    icon: <MessageSquareQuote className="size-5" aria-hidden />,
    title: "Expert reviews",
    description:
      "Short, opinionated summaries that say who a machine is for — and who should walk past it.",
  },
  {
    icon: <TrendingUp className="size-5" aria-hidden />,
    title: "Latest prices",
    description:
      "Street prices against list prices, so a genuine discount is easy to separate from an inflated MRP.",
  },
];

export function NewsletterSection() {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address, e.g. you@example.com");
      return;
    }
    setError(null);
    setSubmitting(true);

    // No backend in the demo — simulate the round trip so the UI states are real.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast("You're on the list. Price drops land every Friday.");
    }, 700);
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <motion.div
        variants={fadeUp}
        {...inView}
        className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-transparent to-brand-600/10 px-6 py-12 sm:px-12 lg:px-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/20 blur-[90px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-brand-600/15 blur-[100px]"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <Mail className="size-5" aria-hidden />
          </span>

          <h2
            id="newsletter-heading"
            className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Price drops, straight to your inbox
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
            One email a week: notable discounts, new launches worth your attention, and
            nothing else.
          </p>

          {done ? (
            <p className="mt-8 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden />
              Subscribed as {email.trim()}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1 text-left">
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white/80 px-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-white/5 dark:placeholder:text-ink-500"
                />
                {error ? (
                  <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                ) : null}
              </div>
              <Button type="submit" loading={submitting} className="sm:shrink-0">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </section>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
