"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * Produces a compact window like `1 … 4 5 6 … 12`, always showing the first and
 * last page plus one neighbour on each side of the current page.
 */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = pageWindow(page, totalPages);

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          base,
          "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40",
          "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>

      {items.map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 text-sm text-ink-400 dark:text-ink-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              base,
              item === page
                ? "border-transparent bg-gradient-to-r from-brand-500 to-brand-600 text-ink-950"
                : "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          base,
          "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40",
          "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
