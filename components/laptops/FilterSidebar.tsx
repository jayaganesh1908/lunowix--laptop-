"use client";

import { RotateCcw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/common/Button";
import { facets } from "@/lib/data/laptops";
import type { Brand, LaptopFilters, OperatingSystem } from "@/lib/types/laptop";
import { formatPrice, formatStorage, shortCpu, shortGpu } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

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
