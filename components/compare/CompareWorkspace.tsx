"use client";

import Link from "next/link";
import { GitCompareArrows, History, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { ComparisonTable } from "./ComparisonTable";
import { LaptopSelector } from "./LaptopSelector";
import { Button } from "@/components/common/Button";
import { buttonStyles } from "@/components/common/buttonStyles";
import { EmptyState } from "@/components/common/EmptyState";
import { useCompare } from "@/lib/hooks/useCompare";
import { formatPrice } from "@/lib/utils/formatters";

export function CompareWorkspace() {
  const compare = useCompare();
  const [first, second] = [compare.laptops[0] ?? null, compare.laptops[1] ?? null];
  const { recordHistory } = compare;

  // Record the pair once both slots are filled so the profile page can list it.
  useEffect(() => {
    if (first && second) recordHistory([first.id, second.id]);
  }, [first, second, recordHistory]);

  const ready = Boolean(first && second);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <LaptopSelector
          label="First laptop"
          selected={first}
          excludeIds={second ? [second.id] : []}
          onSelect={(laptop) => compare.setSlot(0, laptop.id)}
          onClear={() => first && compare.remove(first.id)}
        />
        <LaptopSelector
          label="Second laptop"
          selected={second}
          excludeIds={first ? [first.id] : []}
          onSelect={(laptop) => compare.setSlot(1, laptop.id)}
          onClear={() => second && compare.remove(second.id)}
        />
      </div>

      {ready ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Highlighted cells mark the stronger figure in each row. Price difference:{" "}
              <span className="font-semibold text-ink-900 dark:text-white">
                {formatPrice(Math.abs(first!.price - second!.price))}
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={compare.clear}
              icon={<RotateCcw className="size-3.5" aria-hidden />}
            >
              Clear comparison
            </Button>
          </div>

          <ComparisonTable entries={[first!, second!]} />
        </>
      ) : (
        <EmptyState
          icon={<GitCompareArrows className="size-6" aria-hidden />}
          title={first ? "Pick a second laptop" : "Pick two laptops to compare"}
          description="Search either slot above, or add machines from any laptop card using the compare button."
          action={
            <Link href="/laptops" className={buttonStyles()}>
              Browse laptops
            </Link>
          }
        />
      )}

      {compare.history.length > 0 ? (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            <History className="size-4" aria-hidden />
            Recent comparisons
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {compare.history.map((pair) => (
              <li key={pair.map((item) => item.id).join("-")}>
                <button
                  type="button"
                  onClick={() => {
                    compare.setSlot(0, pair[0].id);
                    compare.setSlot(1, pair[1].id);
                  }}
                  className="card-surface w-full p-4 text-left transition hover:border-brand-500/40"
                >
                  <span className="block text-sm font-semibold">{pair[0].name}</span>
                  <span className="my-1 block text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                    vs
                  </span>
                  <span className="block text-sm font-semibold">{pair[1].name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
