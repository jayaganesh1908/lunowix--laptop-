"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { laptops, searchLaptops } from "@/lib/data/laptops";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Laptop } from "@/lib/types/laptop";
import { formatPrice, shortCpu, shortGpu } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

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
