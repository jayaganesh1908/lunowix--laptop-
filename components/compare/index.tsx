"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Check, GitCompareArrows, History, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/common";
import { EmptyState, Rating, buttonStyles } from "@/components/common/Display";
import { laptops, searchLaptops } from "@/lib/data/laptops";
import { useCompare, useDebouncedValue } from "@/lib/hooks";
import { type Laptop } from "@/lib/types";
import {
  cn,
  formatBattery,
  formatPrice,
  formatStorage,
  formatWeight,
  shortCpu,
  shortGpu,
} from "@/lib/utils";

export interface LaptopSelectorProps {
  label: string;
  selected: Laptop | null;
  /** Ids already used in another slot, hidden from the suggestion list. */
  excludeIds?: string[];
  onSelect: (laptop: Laptop) => void;
  onClear: () => void;
  className?: string;
}

export function LaptopSelector({
  label,
  selected,
  excludeIds = [],
  onSelect,
  onClear,
  className,
}: LaptopSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const inputId = useId();

  const debounced = useDebouncedValue(query, 300);

  const results = useMemo(() => {
    const pool = laptops.filter((laptop) => !excludeIds.includes(laptop.id));
    return searchLaptops(debounced, pool).slice(0, 8);
  }, [debounced, excludeIds]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const choose = (laptop: Laptop) => {
    onSelect(laptop);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  if (selected) {
    return (
      // `min-w-0` stops the default `min-width: auto` on a grid item from
      // forcing the track wider than the container on narrow screens.
      <div
        className={cn(
          "card-surface relative flex min-w-0 items-center gap-4 p-4",
          className,
        )}
      >
        <Image
          src={selected.image}
          alt=""
          width={96}
          height={72}
          className="h-16 w-22 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {selected.brand}
          </p>
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className="truncate text-xs text-ink-500 dark:text-ink-400">
            {shortCpu(selected.specs.processor)} · {shortGpu(selected.specs.gpu)} ·{" "}
            {formatPrice(selected.price)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${selected.name} from comparison`}
          className="shrink-0 rounded-full p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "card-surface flex h-[6.5rem] items-center gap-3 border-dashed px-4",
          "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <Plus className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            {label}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
            <input
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              value={query}
              placeholder="Search by name, brand or GPU…"
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass-strong absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-y-auto rounded-2xl p-1.5 shadow-[var(--shadow-lift)]"
          >
            {results.length === 0 ? (
              <li className="px-3 py-4 text-sm text-ink-500 dark:text-ink-400">
                No laptops match “{query}”.
              </li>
            ) : (
              results.map((laptop, index) => (
                <li key={laptop.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(laptop)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                      index === activeIndex
                        ? "bg-brand-500/10"
                        : "hover:bg-ink-100 dark:hover:bg-white/5",
                    )}
                  >
                    <Image
                      src={laptop.image}
                      alt=""
                      width={56}
                      height={42}
                      className="h-10 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {laptop.name}
                      </span>
                      <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                        {shortGpu(laptop.specs.gpu)} · {laptop.specs.ram}GB
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                      {formatPrice(laptop.price)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type Direction = "higher" | "lower" | "none";

interface Row {
  label: string;
  group: string;
  direction: Direction;
  /** Numeric value used to decide the winner. */
  score: (laptop: Laptop) => number;
  render: (laptop: Laptop) => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: "Price",
    group: "Value",
    direction: "lower",
    score: (l) => l.price,
    render: (l) => (
      <span className="font-mono text-base font-bold tabular-nums">
        {formatPrice(l.price)}
      </span>
    ),
  },
  {
    label: "Rating",
    group: "Value",
    direction: "higher",
    score: (l) => l.rating,
    render: (l) => <Rating value={l.rating} count={l.reviews} />,
  },
  {
    label: "Processor",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.performance.coding,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.processor}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.cores} cores
        </span>
      </>
    ),
  },
  {
    label: "Graphics",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.performance.gaming,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.gpu}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.gpuVram ? `${l.specs.gpuVram} GB VRAM` : "Integrated"}
        </span>
      </>
    ),
  },
  {
    label: "Memory",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.specs.ram,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.ram} GB</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">{l.specs.ramType}</span>
      </>
    ),
  },
  {
    label: "Storage",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.specs.storage,
    render: (l) => (
      <>
        <span className="block font-medium">{formatStorage(l.specs.storage)}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.storageType}
        </span>
      </>
    ),
  },
  {
    label: "Display",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.performance.display,
    render: (l) => (
      <>
        <span className="block font-medium">
          {l.specs.display.size}&quot; {l.specs.display.panel}
        </span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.display.resolution} · {l.specs.display.refreshRate}Hz
        </span>
      </>
    ),
  },
  {
    label: "Battery",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.specs.battery,
    render: (l) => formatBattery(l.specs.battery),
  },
  {
    label: "Weight",
    group: "Chassis",
    direction: "lower",
    score: (l) => l.specs.weight,
    render: (l) => formatWeight(l.specs.weight),
  },
  {
    label: "Ports",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.specs.ports.length,
    render: (l) => (
      <ul className="space-y-1 text-xs">
        {l.specs.ports.map((port) => (
          <li key={port}>{port}</li>
        ))}
      </ul>
    ),
  },
  {
    label: "Coding",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.coding,
    render: (l) => <ScoreCell value={l.performance.coding} />,
  },
  {
    label: "Gaming",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.gaming,
    render: (l) => <ScoreCell value={l.performance.gaming} />,
  },
  {
    label: "Editing",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.editing,
    render: (l) => <ScoreCell value={l.performance.editing} />,
  },
  {
    label: "AI development",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.aiDevelopment,
    render: (l) => <ScoreCell value={l.performance.aiDevelopment} />,
  },
  {
    label: "Overall",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.overall,
    render: (l) => <ScoreCell value={l.performance.overall} />,
  },
  {
    label: "Warranty",
    group: "Ownership",
    direction: "none",
    score: () => 0,
    render: (l) => l.specs.warranty,
  },
];

function ScoreCell({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
    </span>
  );
}

/** Returns the index of the winning column, or -1 when it is a tie. */
function winnerIndex(row: Row, entries: Laptop[]) {
  if (row.direction === "none" || entries.length < 2) return -1;
  const scores = entries.map(row.score);
  const best =
    row.direction === "higher" ? Math.max(...scores) : Math.min(...scores);
  const winners = scores.filter((score) => score === best);
  if (winners.length > 1) return -1;
  return scores.indexOf(best);
}

export function ComparisonTable({
  entries,
  className,
}: {
  entries: Laptop[];
  className?: string;
}) {
  const groups = Array.from(new Set(ROWS.map((row) => row.group)));

  return (
    <div className={cn("card-surface overflow-x-auto", className)}>
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="sr-only">
          Side-by-side comparison of {entries.map((entry) => entry.name).join(" and ")}
        </caption>

        <thead>
          <tr className="border-b border-ink-900/5 dark:border-white/10">
            <th
              scope="col"
              className="sticky left-0 z-10 w-40 bg-white p-4 text-left align-bottom text-xs font-bold uppercase tracking-widest text-ink-500 sm:w-52 dark:bg-ink-900 dark:text-ink-400"
            >
              Specification
            </th>
            {entries.map((laptop) => (
              <th key={laptop.id} scope="col" className="p-4 text-left align-bottom">
                <Image
                  src={laptop.image}
                  alt=""
                  width={160}
                  height={120}
                  className="mb-3 h-24 w-32 rounded-xl object-cover"
                />
                <span className="block text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  {laptop.brand}
                </span>
                <Link
                  href={`/laptops/${laptop.id}`}
                  className="mt-1 block text-base font-semibold tracking-tight hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {laptop.name}
                </Link>
                <Link
                  href={`/laptops/${laptop.id}`}
                  className={buttonStyles({ variant: "outline", size: "sm", className: "mt-3" })}
                >
                  View details
                </Link>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group}>
            <tr>
              <th
                colSpan={entries.length + 1}
                scope="colgroup"
                className="bg-ink-50 px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-ink-500 dark:bg-ink-950/40 dark:text-ink-400"
              >
                {group}
              </th>
            </tr>
            {ROWS.filter((row) => row.group === group).map((row) => {
              const winner = winnerIndex(row, entries);
              return (
                <tr
                  key={row.label}
                  className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white p-4 text-left align-top font-medium text-ink-500 dark:bg-ink-900 dark:text-ink-400"
                  >
                    {row.label}
                  </th>
                  {entries.map((laptop, index) => (
                    <td
                      key={laptop.id}
                      className={cn(
                        "p-4 align-top",
                        index === winner &&
                          "bg-brand-500/[0.08] ring-1 ring-inset ring-brand-500/25",
                      )}
                    >
                      <span className="block">{row.render(laptop)}</span>
                      {index === winner ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                          <Check className="size-3" aria-hidden />
                          Better
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

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
