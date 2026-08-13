"use client";

import { ArrowUpDown } from "lucide-react";
import { useId } from "react";
import { sortOptions } from "@/lib/data/laptops";
import type { SortOption } from "@/lib/types/laptop";
import { cn } from "@/lib/utils/cn";

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
