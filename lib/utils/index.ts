import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Transition, Variants } from "framer-motion";
import { budgetBands, defaultFilters, facets } from "@/lib/data/laptops";
import {
  type Brand,
  type CompatibilityStatus,
  type GamePerformanceTier,
  type LaptopFilters,
  type OperatingSystem,
  type SortOption,
} from "@/lib/types";

/** Conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: easeOut } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: easeOut } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: easeOut } },
};

/** Parent wrapper that staggers its `motion` children. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.02, transition: { duration: 0.28, ease: easeOut } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/** Shared `whileInView` config so sections reveal consistently. */
export const inView = {
  initial: "hidden" as const,
  whileInView: "visible" as const,
  viewport: { once: true, amount: 0.2 },
};

const SORTS: SortOption[] = [
  "newest",
  "price-asc",
  "price-desc",
  "rating",
  "performance",
];

const splitCsv = (value: string | null) =>
  value ? value.split(",").filter(Boolean) : [];

const toNumbers = (values: string[]) =>
  values.map(Number).filter((value) => !Number.isNaN(value));

/**
 * Filters live in the URL so a filtered view can be shared or bookmarked.
 * `budget` is a shorthand that expands into the price range.
 */
export function parseFilters(params: URLSearchParams): LaptopFilters {
  const band = budgetBands.find((entry) => entry.slug === params.get("budget"));

  const minPrice = params.has("min")
    ? Number(params.get("min"))
    : band
      ? Math.max(band.min, facets.minPrice)
      : defaultFilters.minPrice;

  const maxPrice = params.has("max")
    ? Number(params.get("max"))
    : band
      ? Math.min(band.max === Number.POSITIVE_INFINITY ? facets.maxPrice : band.max, facets.maxPrice)
      : defaultFilters.maxPrice;

  return {
    brands: splitCsv(params.get("brands")) as Brand[],
    processors: splitCsv(params.get("cpus")),
    gpus: splitCsv(params.get("gpus")),
    ram: toNumbers(splitCsv(params.get("ram"))),
    storage: toNumbers(splitCsv(params.get("storage"))),
    displaySizes: toNumbers(splitCsv(params.get("sizes"))),
    refreshRates: toNumbers(splitCsv(params.get("hz"))),
    os: splitCsv(params.get("os")) as OperatingSystem[],
    minPrice: Number.isNaN(minPrice) ? defaultFilters.minPrice : minPrice,
    maxPrice: Number.isNaN(maxPrice) ? defaultFilters.maxPrice : maxPrice,
    query: params.get("q") ?? "",
  };
}

export function parseSort(params: URLSearchParams): SortOption {
  const value = params.get("sort") as SortOption | null;
  return value && SORTS.includes(value) ? value : "newest";
}

export function parsePage(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

/** Only non-default values are written, keeping shared URLs short. */
export function serializeFilters(
  filters: LaptopFilters,
  sort: SortOption,
  page: number,
) {
  const params = new URLSearchParams();
  const setList = (key: string, values: (string | number)[]) => {
    if (values.length) params.set(key, values.join(","));
  };

  setList("brands", filters.brands);
  setList("cpus", filters.processors);
  setList("gpus", filters.gpus);
  setList("ram", filters.ram);
  setList("storage", filters.storage);
  setList("sizes", filters.displaySizes);
  setList("hz", filters.refreshRates);
  setList("os", filters.os);

  if (filters.minPrice > facets.minPrice) params.set("min", String(filters.minPrice));
  if (filters.maxPrice < facets.maxPrice) params.set("max", String(filters.maxPrice));
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  return params.toString();
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** ₹1,24,990 */
export function formatPrice(value: number) {
  return inr.format(value);
}

/** ₹1.25L — used where space is tight (budget cards, chart axes). */
export function formatPriceShort(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`;
  return `₹${value}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatCompact(value: number) {
  return compact.format(value);
}

export function formatStorage(gb: number) {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

export function formatRam(gb: number) {
  return `${gb} GB`;
}

export function formatWeight(kg: number) {
  return `${kg.toFixed(2)} kg`;
}

export function formatBattery(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h} hr ${m} min` : `${h} hrs`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function discountPercent(price: number, mrp: number) {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Shortens "NVIDIA GeForce RTX 4060" to "RTX 4060" for dense card layouts. */
export function shortGpu(gpu: string) {
  return gpu
    .replace("NVIDIA GeForce ", "")
    .replace("AMD Radeon ", "Radeon ")
    .replace("Intel ", "");
}

/** Shortens "Intel Core i7-13700H" to "i7-13700H". */
export function shortCpu(cpu: string) {
  return cpu.replace("Intel Core ", "").replace("AMD ", "");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const COMPAT_TONE: Record<CompatibilityStatus, "success" | "info" | "warning" | "danger"> = {
  "Runs Smoothly": "success",
  "Runs Fine": "info",
  Limited: "warning",
  "Not Recommended": "danger",
};

export function compatibilityTone(status: CompatibilityStatus) {
  return COMPAT_TONE[status];
}

const TIER_TONE: Record<GamePerformanceTier, "success" | "info" | "warning" | "danger"> = {
  Flawless: "success",
  Excellent: "info",
  Playable: "warning",
  Struggles: "danger",
};

export function gameTierTone(tier: GamePerformanceTier) {
  return TIER_TONE[tier];
}

/** Maps a 0-100 score onto a human label used beside performance meters. */
export function scoreLabel(score: number) {
  if (score >= 85) return "Exceptional";
  if (score >= 70) return "Very good";
  if (score >= 55) return "Good";
  if (score >= 40) return "Average";
  return "Basic";
}
