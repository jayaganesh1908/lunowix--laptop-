/**
 * Compatibility re-export.
 *
 * This module used to declare its own `Laptop`, `Brand`, `LaptopSpecs` and
 * friends alongside the copies in `lib/types/index.ts`. Two structurally
 * similar but separately-declared interfaces are not assignable to one another,
 * so anything crossing between a file that imported from here and one that
 * imported from `@/lib/types` failed with the long-running
 *
 *   Type 'Laptop' is missing the following properties from type 'Laptop'
 *
 * error — eight of them at its worst. The copies had also drifted: this one
 * never gained `category` or `model3d`, which is what broke `productHref`,
 * `categoryFor` and the compare gate for laptops specifically.
 *
 * Everything exported here now comes from `@/lib/types`, so there is one
 * definition and the two can no longer diverge. Import from `@/lib/types`
 * directly in new code; this file exists so the ~20 existing importers keep
 * working.
 */
export type {
  Brand,
  BudgetBand,
  BudgetSlug,
  DisplaySpec,
  Laptop,
  LaptopFilters,
  LaptopSpecs,
  OperatingSystem,
  PerformanceMetric,
  PerformanceScores,
  Review,
  SortOption,
} from "./index";
