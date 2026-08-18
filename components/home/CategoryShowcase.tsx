import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/Display";
import { productCounts } from "@/lib/data/products";
import { categories } from "@/lib/types";

/**
 * The three catalogues, with the axes each one is judged on.
 *
 * Leading with the axes rather than a product photo is deliberate: the point of
 * the site is that a phone is not ranked the way a laptop is, and that
 * difference is the reason to trust the number at the end.
 */
export function CategoryShowcase() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHeading
        eyebrow="Three catalogues"
        title="Every category judged on its own terms"
        description="A laptop is rated on compile times and battery. A phone on its camera and how long it lasts. Headphones on isolation and comfort. Same method, different questions."
      />

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${category.route}`}
            className="card-surface group flex flex-col p-6 transition hover:border-brand-500/40 hover:shadow-[var(--card-shadow-hover)]"
          >
            <span className="text-3xl" aria-hidden>
              {category.icon}
            </span>

            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {category.pluralLabel}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              {productCounts[category.slug]} profiled
            </p>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              {category.tagline}
            </p>

            <ul className="mt-5 flex flex-wrap gap-1.5">
              {category.axes.map((axis) => (
                <li
                  key={axis.key}
                  className="rounded-full border border-ink-900/10 px-2.5 py-1 text-[11px] font-medium text-ink-600 dark:border-white/10 dark:text-ink-300"
                >
                  {axis.label}
                </li>
              ))}
            </ul>

            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-400">
              Browse {category.pluralLabel.toLowerCase()}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
