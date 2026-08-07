import { budgetBands, defaultFilters, facets } from "@/lib/data/laptops";
import type {
  Brand,
  LaptopFilters,
  OperatingSystem,
  SortOption,
} from "@/lib/types/laptop";

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
