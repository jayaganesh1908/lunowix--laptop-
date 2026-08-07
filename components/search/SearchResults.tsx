"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { LaptopGrid } from "@/components/laptops/LaptopGrid";
import { SearchBar } from "@/components/common/SearchBar";
import { SortDropdown } from "@/components/laptops/SortDropdown";
import { Badge } from "@/components/common/Badge";
import { laptops, searchLaptops, sortLaptops } from "@/lib/data/laptops";
import type { SortOption } from "@/lib/types/laptop";

/** Zero-result fallbacks — the terms people search most often. */
const SUGGESTED_TERMS = [
  "RTX 4060",
  "OLED",
  "Cyberpunk",
  "Android Studio",
  "16 GB",
  "Lenovo",
  "Blender",
  "Linux",
];

export function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>("performance");

  const onQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      const params = new URLSearchParams();
      if (next.trim()) params.set("q", next.trim());
      router.replace(params.toString() ? `/search?${params}` : "/search", {
        scroll: false,
      });
    },
    [router],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return sortLaptops(searchLaptops(query, laptops), sort);
  }, [query, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar
            size="lg"
            autoFocus
            defaultValue={initialQuery}
            onQueryChange={onQueryChange}
            placeholder="Try “RTX 4060”, “Cyberpunk”, “Premiere Pro” or “under 50000”…"
          />
        </div>
        {results.length > 0 ? (
          <SortDropdown value={sort} onChange={setSort} />
        ) : null}
      </div>

      {query.trim() ? (
        <>
          <p aria-live="polite" className="text-sm text-ink-500 dark:text-ink-400">
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-ink-900 dark:text-white">
              “{query.trim()}”
            </span>
          </p>
          <LaptopGrid
            laptops={results}
            emptyTitle={`Nothing matches “${query.trim()}”`}
            emptyDescription="Search covers laptop names, brands, processors, graphics, supported games and software. Try one of the terms below."
            emptyAction={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => onQueryChange(term)}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold transition hover:border-brand-400 hover:text-brand-600 dark:border-white/15"
                  >
                    {term}
                  </button>
                ))}
              </div>
            }
          />
        </>
      ) : (
        <div className="card-surface flex flex-col items-center gap-5 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Search className="size-6" aria-hidden />
          </span>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold tracking-tight">
              Search the whole catalogue
            </h2>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              Names, brands, silicon, budgets, the games a machine can run and the
              software it can handle — all searchable from one box.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_TERMS.map((term) => (
              <button key={term} type="button" onClick={() => onQueryChange(term)}>
                <Badge tone="neutral" className="cursor-pointer hover:border-brand-400">
                  {term}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
