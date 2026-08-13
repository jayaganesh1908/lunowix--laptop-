"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  Cpu,
  GitCompareArrows,
  HardDrive,
  Heart,
  MemoryStick,
  MonitorPlay,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Badge, EmptyState, Rating } from "@/components/common/Display";
import { Button, Pagination, SearchBar } from "@/components/common";
import { useToast } from "@/components/providers";
import {
  budgetBands,
  defaultFilters,
  facets,
  filterLaptops,
  sortLaptops,
  sortOptions,
} from "@/lib/data/laptops";
import { useCompare, useWishlist } from "@/lib/hooks";
import {
  type Brand,
  type Laptop,
  type LaptopFilters,
  type OperatingSystem,
  type SortOption,
} from "@/lib/types";
import {
  cn,
  discountPercent,
  fadeUp,
  formatPrice,
  formatStorage,
  parseFilters,
  parsePage,
  parseSort,
  serializeFilters,
  shortCpu,
  shortGpu,
  staggerFast,
} from "@/lib/utils";
import { useTilt } from "@/components/ui/3d-card";

export interface LaptopCardProps {
  laptop: Laptop;
  /** Renders the image with `priority` for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

export function LaptopCard({ laptop, priority = false, className }: LaptopCardProps) {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast } = useToast();
  // Perspective is tuned to the ~280px grid card, not the 320px standalone card
  // the upstream default assumed — see the note on `UseTiltOptions.perspective`.
  const tilt = useTilt({ intensity: 12, perspective: 650 });

  const saved = wishlist.has(laptop.id);
  const comparing = compare.has(laptop.id);
  const discount = discountPercent(laptop.price, laptop.mrp);

  const onWishlist = () => {
    const added = wishlist.toggle(laptop.id);
    toast(added ? `${laptop.name} added to wishlist` : `${laptop.name} removed from wishlist`);
  };

  const onCompare = () => {
    const added = compare.toggle(laptop.id);
    toast(
      added
        ? `${laptop.name} added to compare`
        : `${laptop.name} removed from compare`,
      added ? "success" : "info",
    );
  };

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden transition-shadow",
        "hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(255,107,0,0.25),0_24px_56px_-24px_rgba(255,107,0,0.5)]",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-ink-50 dark:bg-ink-950">
        <Image
          src={laptop.image}
          alt={`${laptop.name} laptop`}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {laptop.bestseller ? <Badge tone="brand">Bestseller</Badge> : null}
            {discount >= 15 ? <Badge tone="success">{discount}% off</Badge> : null}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onWishlist}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${laptop.name} from wishlist` : `Add ${laptop.name} to wishlist`}
            className={cn(
              "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
              saved ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
            )}
          >
            <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onCompare}
            aria-pressed={comparing}
            aria-label={comparing ? `Remove ${laptop.name} from compare` : `Add ${laptop.name} to compare`}
            className={cn(
              "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
              comparing ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
            )}
          >
            <GitCompareArrows className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          {laptop.brand}
        </p>

        <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight">
          {/* Stretched link keeps the whole card clickable without nesting buttons. */}
          <Link href={`/laptops/${laptop.id}`} className="after:absolute after:inset-0 after:content-['']">
            {laptop.name}
          </Link>
        </h3>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-600 dark:text-ink-300">
          <li className="flex items-center gap-1.5">
            <Cpu className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span className="truncate">{shortCpu(laptop.specs.processor)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MonitorPlay className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span className="truncate">{shortGpu(laptop.specs.gpu)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <MemoryStick className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span>{laptop.specs.ram} GB RAM</span>
          </li>
          <li className="flex items-center gap-1.5">
            <HardDrive className="size-3.5 shrink-0 text-ink-400" aria-hidden />
            <span>{formatStorage(laptop.specs.storage)}</span>
          </li>
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{laptop.specs.display.size}&quot;</Badge>
          <Badge tone={laptop.specs.display.refreshRate >= 120 ? "info" : "neutral"}>
            {laptop.specs.display.refreshRate}Hz
          </Badge>
          <Badge tone="neutral">{laptop.specs.display.panel}</Badge>
        </div>

        <div className="mt-auto pt-4">
          <Rating value={laptop.rating} count={laptop.reviews} />
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatPrice(laptop.price)}
            </span>
            {discount > 0 ? (
              <span className="font-mono text-sm text-ink-500 line-through dark:text-ink-400">
                {formatPrice(laptop.mrp)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

type ArrayFilterKey = {
  [K in keyof LaptopFilters]: LaptopFilters[K] extends readonly unknown[] ? K : never;
}[keyof LaptopFilters];

export interface FilterSidebarProps {
  filters: LaptopFilters;
  onChange: (patch: Partial<LaptopFilters>) => void;
  onReset: () => void;
  resultCount: number;
  className?: string;
}

function FilterGroup({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-ink-900/5 py-4 last:border-b-0 dark:border-white/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold marker:content-none">
        <span className="flex items-center gap-2">
          {title}
          {count ? (
            <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
              {count}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className="text-ink-500 transition-transform duration-200 group-open:rotate-45 dark:text-ink-400"
        >
          +
        </span>
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 transition hover:text-ink-900 dark:text-ink-300 dark:hover:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 rounded border-ink-300 accent-[#e05c00] dark:border-white/20"
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  resultCount,
  className,
}: FilterSidebarProps) {
  const minId = useId();
  const maxId = useId();

  /** Toggles one value inside any of the array-shaped filter keys. */
  function toggle<K extends ArrayFilterKey>(key: K, value: LaptopFilters[K][number]) {
    const current = filters[key] as LaptopFilters[K][number][];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ [key]: next } as Partial<LaptopFilters>);
  }

  const activeCount =
    filters.brands.length +
    filters.processors.length +
    filters.gpus.length +
    filters.ram.length +
    filters.storage.length +
    filters.displaySizes.length +
    filters.refreshRates.length +
    filters.os.length +
    (filters.minPrice > facets.minPrice || filters.maxPrice < facets.maxPrice ? 1 : 0);

  return (
    <aside
      aria-label="Laptop filters"
      className={cn("card-surface flex flex-col p-5", className)}
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest">Filters</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            {resultCount} {resultCount === 1 ? "laptop" : "laptops"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={activeCount === 0}
          icon={<RotateCcw className="size-3.5" aria-hidden />}
        >
          Reset
        </Button>
      </div>

      <FilterGroup title="Price range">
        <div className="space-y-4 pt-1">
          <div>
            <label htmlFor={minId} className="flex justify-between text-xs text-ink-500 dark:text-ink-400">
              <span>Minimum</span>
              <span className="font-mono font-semibold text-ink-800 dark:text-ink-100">
                {formatPrice(filters.minPrice)}
              </span>
            </label>
            <input
              id={minId}
              type="range"
              min={facets.minPrice}
              max={facets.maxPrice}
              step={1000}
              value={filters.minPrice}
              onChange={(event) =>
                onChange({
                  minPrice: Math.min(Number(event.target.value), filters.maxPrice - 1000),
                })
              }
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-[#e05c00] dark:bg-white/15"
            />
          </div>
          <div>
            <label htmlFor={maxId} className="flex justify-between text-xs text-ink-500 dark:text-ink-400">
              <span>Maximum</span>
              <span className="font-mono font-semibold text-ink-800 dark:text-ink-100">
                {formatPrice(filters.maxPrice)}
              </span>
            </label>
            <input
              id={maxId}
              type="range"
              min={facets.minPrice}
              max={facets.maxPrice}
              step={1000}
              value={filters.maxPrice}
              onChange={(event) =>
                onChange({
                  maxPrice: Math.max(Number(event.target.value), filters.minPrice + 1000),
                })
              }
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-[#e05c00] dark:bg-white/15"
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Brand" count={filters.brands.length}>
        {facets.brands.map((brand) => (
          <CheckboxRow
            key={brand}
            label={brand}
            checked={filters.brands.includes(brand)}
            onChange={() => toggle("brands", brand as Brand)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Graphics" count={filters.gpus.length}>
        {facets.gpus.map((gpu) => (
          <CheckboxRow
            key={gpu}
            label={shortGpu(gpu)}
            checked={filters.gpus.includes(gpu)}
            onChange={() => toggle("gpus", gpu)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Processor" count={filters.processors.length} defaultOpen={false}>
        {facets.processors.map((processor) => (
          <CheckboxRow
            key={processor}
            label={shortCpu(processor)}
            checked={filters.processors.includes(processor)}
            onChange={() => toggle("processors", processor)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Memory" count={filters.ram.length}>
        {facets.ram.map((ram) => (
          <CheckboxRow
            key={ram}
            label={`${ram} GB`}
            checked={filters.ram.includes(ram)}
            onChange={() => toggle("ram", ram)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Storage" count={filters.storage.length} defaultOpen={false}>
        {facets.storage.map((storage) => (
          <CheckboxRow
            key={storage}
            label={formatStorage(storage)}
            checked={filters.storage.includes(storage)}
            onChange={() => toggle("storage", storage)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Display size" count={filters.displaySizes.length} defaultOpen={false}>
        {facets.displaySizes.map((size) => (
          <CheckboxRow
            key={size}
            label={`${size} inch`}
            checked={filters.displaySizes.includes(size)}
            onChange={() => toggle("displaySizes", size)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Refresh rate" count={filters.refreshRates.length} defaultOpen={false}>
        {facets.refreshRates.map((rate) => (
          <CheckboxRow
            key={rate}
            label={`${rate} Hz`}
            checked={filters.refreshRates.includes(rate)}
            onChange={() => toggle("refreshRates", rate)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Operating system" count={filters.os.length} defaultOpen={false}>
        {facets.os.map((os) => (
          <CheckboxRow
            key={os}
            label={os}
            checked={filters.os.includes(os)}
            onChange={() => toggle("os", os as OperatingSystem)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

export interface LaptopGridProps {
  laptops: Laptop[];
  columns?: "three" | "four";
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function LaptopGrid({
  laptops,
  columns = "four",
  emptyAction,
  emptyTitle = "No laptops match those filters",
  emptyDescription = "Try widening the price range or clearing a couple of filters — there are 25 machines in the catalogue.",
  className,
}: LaptopGridProps) {
  if (laptops.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <motion.div
      variants={staggerFast}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2",
        columns === "four" ? "xl:grid-cols-3 2xl:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {laptops.map((laptop, index) => (
        <LaptopCard key={laptop.id} laptop={laptop} priority={index < 4} />
      ))}
    </motion.div>
  );
}

export function SortDropdown({
  value,
  onChange,
  className,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor={id}
        className="flex shrink-0 items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400"
      >
        <ArrowUpDown className="size-4" aria-hidden />
        <span className="hidden sm:inline">Sort by</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        className={cn(
          "h-10 rounded-xl border border-ink-200 bg-white/80 px-3 pr-8 text-sm font-medium outline-none transition",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
          "dark:border-white/15 dark:bg-ink-800 dark:text-ink-100",
        )}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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
