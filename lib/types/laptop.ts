import type { GameBenchmark } from "./game";
import type { SoftwareCompatibilityMap } from "./software";

export type Brand = "Lenovo" | "HP" | "Dell" | "ASUS" | "Acer" | "MSI" | "Samsung";

export type OperatingSystem = "Windows" | "macOS" | "Linux";

export type BudgetSlug =
  | "under-30k"
  | "30k-40k"
  | "40k-50k"
  | "50k-70k"
  | "70k-1l"
  | "above-1l";

export interface BudgetBand {
  slug: BudgetSlug;
  label: string;
  shortLabel: string;
  min: number;
  /** Exclusive upper bound; `Infinity` for the open-ended top band. */
  max: number;
  description: string;
}

export interface DisplaySpec {
  size: number;
  resolution: string;
  refreshRate: number;
  panel: string;
  touch: boolean;
}

export interface LaptopSpecs {
  processor: string;
  cores: number;
  ram: number;
  ramType: string;
  storage: number;
  storageType: string;
  gpu: string;
  gpuVram: number;
  display: DisplaySpec;
  battery: number;
  weight: number;
  ports: string[];
  keyboard: string;
  wifi: string;
  bluetooth: string;
  webcam: string;
  warranty: string;
  os: OperatingSystem;
}

export interface PerformanceScores {
  coding: number;
  gaming: number;
  editing: number;
  battery: number;
  display: number;
  aiDevelopment: number;
  overall: number;
}

export type PerformanceMetric = keyof PerformanceScores;

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
}

export interface Laptop {
  id: string;
  name: string;
  brand: Brand;
  /** Street price in ₹. */
  price: number;
  /** List price in ₹, used to derive the discount badge. */
  mrp: number;
  summary: string;
  specs: LaptopSpecs;
  performance: PerformanceScores;
  games: GameBenchmark[];
  software: SoftwareCompatibilityMap;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  reviewList: Review[];
  bestseller: boolean;
  releaseYear: number;
  /** Drives the admin "most viewed" ranking. */
  views: number;
  tags: string[];
  /** Placeholder for a future affiliate integration. */
  affiliateUrl: string;
  inStock: boolean;
}

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "performance";

export interface LaptopFilters {
  brands: Brand[];
  processors: string[];
  gpus: string[];
  ram: number[];
  storage: number[];
  displaySizes: number[];
  refreshRates: number[];
  os: OperatingSystem[];
  minPrice: number;
  maxPrice: number;
  query: string;
}
