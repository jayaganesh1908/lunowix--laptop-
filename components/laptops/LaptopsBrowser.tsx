"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterSidebar } from "./FilterSidebar";
import { LaptopGrid } from "./LaptopGrid";
import { SortDropdown } from "./SortDropdown";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Pagination } from "@/components/common/Pagination";
import { SearchBar } from "@/components/common/SearchBar";
import {
  budgetBands,
  defaultFilters,
  facets,
  filterLaptops,
  sortLaptops,
} from "@/lib/data/laptops";
import type { Laptop, LaptopFilters, SortOption } from "@/lib/types/laptop";
import {
  parseFilters,
  parsePage,
  parseSort,
  serializeFilters,
} from "@/lib/utils/filterParams";
import { formatPrice, shortCpu, shortGpu } from "@/lib/utils/formatters";

const PAGE_SIZE = 9;

/**
 * The catalogue arrives as a prop rather than being imported: this is a client
 * component, so it cannot query the database itself. The server page fetches
 * and hands it down.
 */
export function LaptopsBrowser({ catalogue }: { catalogue: Laptop[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // The URL is the single source of truth, so back/forward and shared links work.
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const sort = useMemo(
    () => parseSort(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const page = useMemo(
    () => parsePage(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const activeBudget = searchParams.get("budget");

  const push = useCallback(
    (next: LaptopFilters, nextSort: SortOption, nextPage: number) => {
      const query = serializeFilters(next, nextSort, nextPage);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Any filter change resets to page 1 — page 4 of a narrower result set is noise.
  const onFilterChange = useCallback(
    (patch: Partial<LaptopFilters>) => push({ ...filters, ...patch }, sort, 1),
    [filters, sort, push],
  );

  const onReset = useCallback(() => push(defaultFilters, sort, 1), [sort, push]);

  const onQueryChange = useCallback(
    (query: string) => {
      if (query === filters.query) return;
      push({ ...filters, query }, sort, 1);
    },
    [filters, sort, push],
  );

  const results = useMemo(
    () => sortLaptops(filterLaptops(filters, catalogue), sort),
    [catalogue, filters, sort],
  );

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const chips = [
    ...filters.brands.map((value) => ({ label: value, clear: () => onFilterChange({ brands: filters.brands.filter((b) => b !== value) }) })),
    ...filters.gpus.map((value) => ({ label: shortGpu(value), clear: () => onFilterChange({ gpus: filters.gpus.filter((g) => g !== value) }) })),
    ...filters.processors.map((value) => ({ label: shortCpu(value), clear: () => onFilterChange({ processors: filters.processors.filter((c) => c !== value) }) })),
    ...filters.ram.map((value) => ({ label: `${value} GB RAM`, clear: () => onFilterChange({ ram: filters.ram.filter((r) => r !== value) }) })),
    ...filters.refreshRates.map((value) => ({ label: `${value} Hz`, clear: () => onFilterChange({ refreshRates: filters.refreshRates.filter((r) => r !== value) }) })),
    ...filters.os.map((value) => ({ label: value, clear: () => onFilterChange({ os: filters.os.filter((o) => o !== value) }) })),
  ];

  const priceNarrowed =
    filters.minPrice > facets.minPrice || filters.maxPrice < facets.maxPrice;

  const sidebar = (
    <FilterSidebar
      filters={filters}
      onChange={onFilterChange}
      onReset={onReset}
      resultCount={results.length}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
      {/* Budget quick-switch */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeBudget
              ? "border-ink-200 text-ink-600 hover:border-brand-400 dark:border-white/15 dark:text-ink-300"
              : "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
          }`}
        >
          All budgets
        </button>
        {budgetBands.map((band) => (
          <button
            key={band.slug}
            type="button"
            onClick={() =>
              router.replace(`${pathname}?budget=${band.slug}`, { scroll: false })
            }
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeBudget === band.slug
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "border-ink-200 text-ink-600 hover:border-brand-400 dark:border-white/15 dark:text-ink-300"
            }`}
          >
            {band.shortLabel}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto">
            {sidebar}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                defaultValue={filters.query}
                onQueryChange={onQueryChange}
                placeholder="Filter these results…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDrawerOpen(true)}
                icon={<SlidersHorizontal className="size-4" aria-hidden />}
                className="lg:hidden"
              >
                Filters
              </Button>
              <SortDropdown
                value={sort}
                onChange={(next) => push(filters, next, 1)}
              />
            </div>
          </div>

          {chips.length > 0 || priceNarrowed ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {priceNarrowed ? (
                <Badge tone="brand">
                  {formatPrice(filters.minPrice)} – {formatPrice(filters.maxPrice)}
                </Badge>
              ) : null}
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold transition hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:hover:border-brand-500/60"
                >
                  {chip.label}
                  <X className="size-3" aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
              >
                Clear all
              </button>
            </div>
          ) : null}

          <p
            aria-live="polite"
            className="mt-4 text-sm text-ink-500 dark:text-ink-400"
          >
            Showing {pageItems.length} of {results.length}{" "}
            {results.length === 1 ? "laptop" : "laptops"}
          </p>

          <LaptopGrid
            laptops={pageItems}
            columns="three"
            className="mt-5"
            emptyAction={<Button onClick={onReset}>Clear all filters</Button>}
          />

          {totalPages > 1 ? (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={(next) => {
                push(filters, sort, next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-10 justify-center"
            />
          ) : null}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 flex w-[min(22rem,90vw)] flex-col bg-white dark:bg-ink-950"
          >
            <div className="flex items-center justify-between border-b border-ink-900/5 px-4 py-3 dark:border-white/10">
              <h2 className="text-sm font-bold uppercase tracking-widest">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="rounded-full p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-white/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
            <div className="border-t border-ink-900/5 p-4 dark:border-white/10">
              <Button className="w-full" onClick={() => setDrawerOpen(false)}>
                Show {results.length} {results.length === 1 ? "laptop" : "laptops"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
