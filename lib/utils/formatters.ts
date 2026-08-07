import type { CompatibilityStatus } from "@/lib/types/software";
import type { GamePerformanceTier } from "@/lib/types/game";

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
