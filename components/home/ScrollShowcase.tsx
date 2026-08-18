"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { buttonStyles } from "@/components/common/buttonStyles";
import { cn } from "@/lib/utils";

/*
 * What the scroll card actually holds.
 *
 * The upstream demo drops a screenshot from `ui.aceternity.com` into it. That
 * would fail here on the first render — `next.config.ts` configures no
 * `remotePatterns`, so `next/image` rejects the host — and a screenshot of
 * someone else's product is a strange thing to put on a laptop-comparison home
 * page anyway. The card shows the real comparison table instead, with real
 * catalogue figures, and links to the live comparison of the same two machines.
 *
 * Everything arrives pre-formatted as props. The home page is a server
 * component and does the picking and formatting there, so the catalogue — 59
 * products, each with a review list — never crosses into the client bundle to
 * render four rows.
 */

export interface ShowcaseProduct {
  name: string;
  brand: string;
  image: string;
  href: string;
}

export interface ShowcaseRow {
  label: string;
  values: [string, string];
  /** Index of the stronger column, or -1 when neither wins. */
  winner: number;
}

export interface ScrollShowcaseProps {
  products: [ShowcaseProduct, ShowcaseProduct];
  rows: ShowcaseRow[];
  compareHref: string;
}

export function ScrollShowcase({ products, rows, compareHref }: ScrollShowcaseProps) {
  return (
    <section aria-labelledby="showcase-heading">
      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-3xl px-4">
            <h2
              id="showcase-heading"
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Two machines, one table
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
              Every row scored, the stronger figure marked. No spec sheets to decode
              and no tab-switching to remember what the other one cost.
            </p>
          </div>
        }
      >
        <div className="flex h-full flex-col p-4 sm:p-6">
          {/* Column headers */}
          <div className="grid grid-cols-[minmax(4.5rem,7rem)_1fr_1fr] items-end gap-2 border-b border-ink-900/10 pb-3 sm:gap-4 dark:border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500 sm:text-[10px] dark:text-ink-400">
              Spec
            </span>
            {products.map((product) => (
              <div key={product.name} className="min-w-0">
                <Image
                  src={product.image}
                  alt=""
                  width={128}
                  height={96}
                  className="mb-2 h-12 w-16 rounded-lg object-cover sm:h-16 sm:w-24"
                />
                <span className="block text-[11px] font-semibold uppercase tracking-widest text-brand-600 sm:text-[10px] dark:text-brand-400">
                  {product.brand}
                </span>
                <span className="block truncate text-xs font-semibold sm:text-sm">
                  {product.name}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="min-h-0 flex-1">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(4.5rem,7rem)_1fr_1fr] items-center gap-2 border-b border-ink-900/5 py-2.5 last:border-b-0 sm:gap-4 sm:py-3 dark:border-white/5"
              >
                <span className="text-[11px] font-medium text-ink-500 sm:text-xs dark:text-ink-400">
                  {row.label}
                </span>
                {row.values.map((value, index) => (
                  <span
                    key={index}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs tabular-nums sm:text-sm",
                      index === row.winner &&
                        "bg-brand-500/10 font-semibold ring-1 ring-inset ring-brand-500/25",
                    )}
                  >
                    {value}
                    {index === row.winner ? (
                      <Check
                        className="size-3 shrink-0 text-brand-600 dark:text-brand-400"
                        aria-label="Stronger figure"
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-3">
            <Link href={compareHref} className={buttonStyles({ size: "sm" })}>
              Open this comparison
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}
