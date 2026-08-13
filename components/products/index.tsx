"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  BatteryCharging,
  Camera,
  Cpu,
  EarOff,
  GitCompareArrows,
  HardDrive,
  Heart,
  MemoryStick,
  MonitorPlay,
  Search,
  Smartphone,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, EmptyState, Rating } from "@/components/common/Display";
import { useToast } from "@/components/providers";
import { sortProducts } from "@/lib/data/products";
import { useCompare, useDebouncedValue, usePrefersReducedMotion, useWishlist } from "@/lib/hooks";
import {
  categoryFor,
  productHref,
  type Product,
  type ProductBrand,
  type ProductSortOption,
} from "@/lib/types";
import {
  cn,
  discountPercent,
  fadeUp,
  formatPrice,
  formatStorage,
  shortCpu,
  shortGpu,
  staggerContainer,
} from "@/lib/utils";

export interface ProductCardProps {
  product: Product;
  /** Renders the image with `priority` for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

interface SpecChip {
  Icon: LucideIcon;
  label: string;
}

/**
 * The four specs worth putting on a card, per category.
 *
 * The union means the compiler enforces that a headphone branch cannot reach
 * for a GPU — which is the whole reason the catalogues are a discriminated
 * union rather than one bag of optional fields.
 */
function specChips(product: Product): SpecChip[] {
  switch (product.category) {
    case "laptop":
      return [
        { Icon: Cpu, label: shortCpu(product.specs.processor) },
        { Icon: MonitorPlay, label: shortGpu(product.specs.gpu) },
        { Icon: MemoryStick, label: `${product.specs.ram} GB RAM` },
        { Icon: HardDrive, label: formatStorage(product.specs.storage) },
      ];
    case "phone":
      return [
        { Icon: Cpu, label: product.specs.chipset.replace(/^(Qualcomm|MediaTek|Samsung|Google|Apple)\s+/, "") },
        { Icon: Camera, label: `${product.specs.camera.main.mp}MP main` },
        { Icon: MemoryStick, label: `${product.specs.ram} GB · ${formatStorage(product.specs.storage)}` },
        { Icon: BatteryCharging, label: `${product.specs.battery} mAh` },
      ];
    case "headphone":
      return [
        { Icon: Smartphone, label: product.specs.form },
        { Icon: EarOff, label: product.specs.anc === "None" ? "No ANC" : product.specs.anc },
        {
          Icon: BatteryCharging,
          label:
            product.specs.connection === "Wired"
              ? "Wired"
              : `${product.specs.batteryHours + product.specs.caseHours} h total`,
        },
        { Icon: Volume2, label: `${product.specs.driver.size}mm driver` },
      ];
  }
}

/** The two or three badges under the specs. */
function badges(product: Product) {
  switch (product.category) {
    case "laptop":
      return [
        { tone: "neutral" as const, label: `${product.specs.display.size}"` },
        {
          tone: product.specs.display.refreshRate >= 120 ? ("info" as const) : ("neutral" as const),
          label: `${product.specs.display.refreshRate}Hz`,
        },
        { tone: "neutral" as const, label: product.specs.display.panel },
      ];
    case "phone":
      return [
        { tone: "neutral" as const, label: `${product.specs.display.size}"` },
        {
          tone: product.specs.display.refreshRate >= 120 ? ("info" as const) : ("neutral" as const),
          label: `${product.specs.display.refreshRate}Hz`,
        },
        {
          tone: product.specs.charging >= 65 ? ("info" as const) : ("neutral" as const),
          label: `${product.specs.charging}W`,
        },
      ];
    case "headphone":
      return [
        {
          tone: product.specs.codecs.includes("LDAC") ? ("info" as const) : ("neutral" as const),
          label: product.specs.codecs.includes("LDAC")
            ? "LDAC"
            : (product.specs.codecs.at(-1) ?? "SBC"),
        },
        { tone: "neutral" as const, label: product.specs.connection },
        ...(product.specs.multipoint
          ? [{ tone: "neutral" as const, label: "Multipoint" }]
          : []),
      ];
  }
}

const CATEGORY_NOUN: Record<Product["category"], string> = {
  laptop: "laptop",
  phone: "phone",
  headphone: "headphones",
};

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast } = useToast();

  const saved = wishlist.has(product.id);
  const comparing = compare.has(product.id);
  const discount = discountPercent(product.price, product.mrp);

  const onWishlist = () => {
    const added = wishlist.toggle(product.id);
    toast(added ? `${product.name} added to wishlist` : `${product.name} removed from wishlist`);
  };

  const onCompare = () => {
    const added = compare.toggle(product.id);
    toast(
      added ? `${product.name} added to compare` : `${product.name} removed from compare`,
      added ? "success" : "info",
    );
  };

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden transition-shadow",
        "hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(255,107,0,0.25),0_24px_56px_-24px_rgba(255,107,0,0.5)]",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-ink-50 dark:bg-ink-950">
        <Image
          src={product.image}
          alt={`${product.name} ${CATEGORY_NOUN[product.category]}`}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {product.bestseller ? <Badge tone="brand">Bestseller</Badge> : null}
            {discount >= 15 ? <Badge tone="success">{discount}% off</Badge> : null}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onWishlist}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            className={cn(
              "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
              saved ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
            )}
          >
            <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
          </button>
          {/* The comparison table is built around laptop specs, so the control
              is only offered where it leads somewhere. */}
          {product.category === "laptop" ? (
            <button
              type="button"
              onClick={onCompare}
              aria-pressed={comparing}
              aria-label={
                comparing
                  ? `Remove ${product.name} from compare`
                  : `Add ${product.name} to compare`
              }
              className={cn(
                "glass-strong flex size-9 items-center justify-center rounded-xl transition hover:text-brand-600",
                comparing ? "text-brand-600 dark:text-brand-400" : "text-ink-600 dark:text-ink-200",
              )}
            >
              <GitCompareArrows className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          {product.brand}
        </p>

        <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight">
          {/* Stretched link keeps the whole card clickable without nesting buttons. */}
          <Link href={productHref(product)} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-600 dark:text-ink-300">
          {specChips(product).map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0 text-ink-400" aria-hidden />
              <span className="truncate" title={label}>
                {label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {badges(product).map(({ tone, label }) => (
            <Badge key={label} tone={tone}>
              {label}
            </Badge>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <Rating value={product.rating} count={product.reviews} />
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums">
              {formatPrice(product.price)}
            </span>
            {discount > 0 ? (
              <span className="font-mono text-sm text-ink-500 line-through dark:text-ink-400">
                {formatPrice(product.mrp)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export interface ProductScoresProps {
  product: Product;
  className?: string;
}

function toneFor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-brand-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-rose-500";
}

/**
 * Score meters, driven by the axis list that travels with the category.
 *
 * Laptops are rated on coding and AI work, phones on camera and battery,
 * headphones on isolation and comfort — so the axes cannot be hardcoded here.
 * Each one carries the weighting that produced it, which is shown on hover and
 * to screen readers, because a bare number invites more trust than it earns.
 */
export function ProductScores({ product, className }: ProductScoresProps) {
  const meta = categoryFor(product);
  const reduced = usePrefersReducedMotion();
  const scores = product.performance as unknown as Record<string, number>;

  // A wired set has no battery to rate; showing it a zero would read as a
  // failing grade rather than "not applicable".
  const notApplicable = (key: string) =>
    product.category === "headphone" &&
    key === "battery" &&
    product.specs.connection === "Wired";

  return (
    <div className={cn("card-surface p-5 sm:p-6", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          Overall
        </h3>
        <p className="font-mono text-3xl font-bold tabular-nums">
          {product.performance.overall}
          <span className="ml-1 text-base font-normal text-ink-500 dark:text-ink-400">/100</span>
        </p>
      </div>

      <dl className="mt-6 space-y-4">
        {meta.axes.map((axis) => {
          const value = scores[axis.key] ?? 0;
          const na = notApplicable(axis.key);

          return (
            <div key={axis.key}>
              <div className="flex items-baseline justify-between gap-3">
                <dt
                  className="text-sm font-medium"
                  title={axis.hint}
                >
                  {axis.label}
                  <span className="sr-only"> — weighted as {axis.hint}</span>
                </dt>
                <dd className="font-mono text-sm font-semibold tabular-nums">
                  {na ? (
                    <span className="text-ink-500 dark:text-ink-400">n/a</span>
                  ) : (
                    value
                  )}
                </dd>
              </div>

              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-900/8 dark:bg-white/10"
                role="meter"
                aria-valuenow={na ? undefined : value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${axis.label}: ${na ? "not applicable" : `${value} out of 100`}`}
              >
                {!na && (
                  <motion.div
                    className={cn("h-full rounded-full", toneFor(value))}
                    initial={reduced ? false : { width: 0 }}
                    whileInView={{ width: `${value}%` }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    style={reduced ? { width: `${value}%` } : undefined}
                  />
                )}
              </div>

              <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">{axis.hint}</p>
            </div>
          );
        })}
      </dl>

      <p className="mt-6 border-t border-ink-900/8 pt-4 text-xs text-ink-500 dark:border-white/10 dark:text-ink-400">
        Modelled estimates derived from the specification, not measured benchmark runs.
      </p>
    </div>
  );
}

/**
 * The extra single-select facet is named by a **field key**, not by a getter
 * function. This component is a client component, and functions cannot cross
 * the server/client boundary — passing `of: (p) => p.specs.form` from a server
 * page throws at render. The key is a plain string, so it serialises.
 */
export type FacetField = "form" | "anc" | "connection" | "os" | "brand";

export interface ProductBrowserProps {
  products: Product[];
  facet?: { label: string; field: FacetField; values: string[] };
  className?: string;
}

function facetValue(product: Product, field: FacetField): string {
  if (field === "brand") return product.brand;

  switch (product.category) {
    case "headphone":
      if (field === "form") return product.specs.form;
      if (field === "anc") return product.specs.anc;
      if (field === "connection") return product.specs.connection;
      return "";
    case "phone":
      return field === "os" ? product.specs.os : "";
    case "laptop":
      return field === "os" ? product.specs.os : "";
  }
}

const SORTS: { value: ProductSortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
  { value: "performance", label: "Best overall score" },
];

export function ProductBrowser({ products, facet, className }: ProductBrowserProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProductSortOption>("performance");
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedFacet, setSelectedFacet] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const debounced = useDebouncedValue(query, 200);

  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort() as ProductBrand[],
    [products],
  );

  const priceCeiling = useMemo(
    () => Math.max(...products.map((p) => p.price)),
    [products],
  );

  const visible = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    const terms = needle ? needle.split(/\s+/) : [];

    const matched = products.filter((product) => {
      if (brands.length && !brands.includes(product.brand)) return false;
      if (facet && selectedFacet && facetValue(product, facet.field) !== selectedFacet) {
        return false;
      }
      if (maxPrice !== null && product.price > maxPrice) return false;

      if (terms.length) {
        const haystack = [product.name, product.brand, product.summary, ...product.tags]
          .join(" ")
          .toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      return true;
    });

    return sortProducts(matched, sort);
  }, [products, brands, facet, selectedFacet, maxPrice, debounced, sort]);

  const active =
    brands.length > 0 || selectedFacet !== null || maxPrice !== null || query !== "";

  const reset = () => {
    setBrands([]);
    setSelectedFacet(null);
    setMaxPrice(null);
    setQuery("");
  };

  const toggleBrand = (brand: string) =>
    setBrands((current) =>
      current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand],
    );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="card-surface flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, brand or what you need it for…"
              aria-label="Search products"
              className="w-full rounded-xl border border-ink-900/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/10 dark:bg-white/[0.04]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <SlidersHorizontal className="size-4 text-ink-400" aria-hidden />
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProductSortOption)}
              aria-label="Sort products"
              className="rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/10 dark:bg-white/[0.04]"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allBrands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => toggleBrand(brand)}
              aria-pressed={brands.includes(brand)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                brands.includes(brand)
                  ? "border-brand-500 bg-brand-500 text-ink-950"
                  : "border-ink-900/10 text-ink-600 hover:border-brand-500/50 dark:border-white/10 dark:text-ink-300",
              )}
            >
              {brand}
            </button>
          ))}
        </div>

        {facet ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              {facet.label}
            </span>
            {facet.values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedFacet((current) => (current === value ? null : value))}
                aria-pressed={selectedFacet === value}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  selectedFacet === value
                    ? "border-brand-500 bg-brand-500 text-ink-950"
                    : "border-ink-900/10 text-ink-600 hover:border-brand-500/50 dark:border-white/10 dark:text-ink-300",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-1 items-center gap-3 text-xs text-ink-600 dark:text-ink-300">
            <span className="whitespace-nowrap">
              Max {maxPrice === null ? "— any" : formatPrice(maxPrice)}
            </span>
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={1000}
              value={maxPrice ?? priceCeiling}
              onChange={(event) => {
                const value = Number(event.target.value);
                setMaxPrice(value >= priceCeiling ? null : value);
              }}
              aria-label="Maximum price"
              className="h-1.5 flex-1 cursor-pointer accent-brand-500"
            />
          </label>

          {active ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-500/10 dark:text-brand-400"
            >
              <X className="size-3.5" aria-hidden />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-ink-500 dark:text-ink-400">
        {visible.length} of {products.length} shown
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" aria-hidden />}
          title="Nothing matches those filters"
          description="Try widening the price range or clearing a brand."
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 3} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
