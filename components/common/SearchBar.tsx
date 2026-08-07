"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { laptops, searchLaptops } from "@/lib/data/laptops";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatPrice, shortGpu } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
  className?: string;
  /**
   * When set, the bar switches to "filter mode": the debounced query is
   * reported upward and the suggestion popover and navigation are disabled,
   * because the page it lives on is already showing the results.
   */
  onQueryChange?: (query: string) => void;
}

export function SearchBar({
  placeholder = "Search laptops, GPUs, games or software…",
  defaultValue = "",
  autoFocus = false,
  size = "sm",
  className,
  onQueryChange,
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const debounced = useDebouncedValue(value, 300);

  useEffect(() => {
    onQueryChange?.(debounced);
  }, [debounced, onQueryChange]);

  const filterMode = Boolean(onQueryChange);

  const suggestions = useMemo(() => {
    if (filterMode || debounced.trim().length < 2) return [];
    return searchLaptops(debounced, laptops).slice(0, 6);
  }, [debounced, filterMode]);

  // Close the popover on an outside click.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = () => {
    if (filterMode) return;
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      go(`/laptops/${suggestions[activeIndex].id}`);
      return;
    }
    if (value.trim()) go(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-ink-200 bg-white/80 px-3 backdrop-blur transition",
          "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25",
          "dark:border-white/15 dark:bg-white/5",
          size === "lg" ? "h-13 px-4" : "h-10",
        )}
      >
        <Search
          className={cn("shrink-0 text-ink-400", size === "lg" ? "size-5" : "size-4")}
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Search laptops"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500",
            size === "lg" ? "text-base" : "text-sm",
            "[&::-webkit-search-cancel-button]:hidden",
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {showList ? (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass-strong absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-96 overflow-y-auto rounded-2xl p-1.5 shadow-[var(--shadow-lift)]"
          >
            {suggestions.map((laptop, index) => (
              <li key={laptop.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(`/laptops/${laptop.id}`)}
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
                      {shortGpu(laptop.specs.gpu)} · {laptop.specs.ram}GB ·{" "}
                      {laptop.specs.display.refreshRate}Hz
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                    {formatPrice(laptop.price)}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={submit}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-brand-700 hover:bg-brand-500/10 dark:text-brand-400"
              >
                See all results for “{value.trim()}”
              </button>
            </li>
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
