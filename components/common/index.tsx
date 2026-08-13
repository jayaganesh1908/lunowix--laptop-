"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { Badge, buttonStyles, type ButtonSize, type ButtonVariant } from "./Display";
import { laptops, searchLaptops } from "@/lib/data/laptops";
import { useDebouncedValue, useTheme } from "@/lib/hooks";
import { type CompatibilityStatus, type GameBenchmark, type Software } from "@/lib/types";
import {
  cn,
  compatibilityTone,
  fadeUp,
  formatPrice,
  gameTierTone,
  scoreLabel,
  shortGpu,
} from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface group relative overflow-hidden p-6",
        "hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(255,107,0,0.25),0_20px_48px_-20px_rgba(255,107,0,0.45)]",
        className,
      )}
    >
      {/* Decorative wash that warms up on hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-brand-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="relative mt-5 text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        {description}
      </p>
    </motion.article>
  );
}

const PRESET_TONE = {
  Ultra: "brand",
  High: "success",
  Medium: "info",
  Low: "neutral",
} as const;

export function GameCard({
  benchmark,
  className,
}: {
  benchmark: GameBenchmark;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface flex flex-col gap-3 p-4 hover:border-brand-500/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-xl bg-ink-100 text-xl dark:bg-ink-950/60"
          >
            {benchmark.icon}
          </span>
          <h3 className="text-sm font-semibold leading-tight">{benchmark.name}</h3>
        </div>
        <Badge tone={gameTierTone(benchmark.tier)}>{benchmark.tier}</Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
              {benchmark.fps}
            </span>
            <span className="text-xs font-medium text-ink-500 dark:text-ink-400">fps</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
            <Gauge className="size-3" aria-hidden />
            1080p estimate
          </p>
        </div>
        <Badge tone={PRESET_TONE[benchmark.graphics]}>{benchmark.graphics}</Badge>
      </div>
    </motion.article>
  );
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * Produces a compact window like `1 … 4 5 6 … 12`, always showing the first and
 * last page plus one neighbour on each side of the current page.
 */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = pageWindow(page, totalPages);

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          base,
          "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40",
          "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>

      {items.map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 text-sm text-ink-400 dark:text-ink-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              base,
              item === page
                ? "border-transparent bg-gradient-to-r from-brand-500 to-brand-600 text-ink-950"
                : "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          base,
          "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40",
          "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:text-brand-300",
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}

/** Red → amber → emerald as the score climbs, with orange for the mid band. */
function barColor(score: number) {
  if (score >= 80) return "from-emerald-400 to-emerald-600";
  if (score >= 60) return "from-brand-400 to-brand-600";
  if (score >= 40) return "from-yellow-400 to-yellow-600";
  return "from-rose-400 to-rose-600";
}

export interface PerformanceMeterProps {
  label: string;
  score: number;
  description?: string;
  icon?: React.ReactNode;
  delay?: number;
  showLabel?: boolean;
  className?: string;
}

export function PerformanceMeter({
  label,
  score,
  description,
  icon,
  delay = 0,
  showLabel = true,
  className,
}: PerformanceMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
          {icon}
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          {showLabel ? (
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {scoreLabel(score)}
            </span>
          ) : null}
          <span className="font-mono text-sm font-semibold tabular-nums text-ink-900 dark:text-white">
            {score}
          </span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score`}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10"
      >
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", barColor(score))}
          initial={{ width: 0 }}
          animate={inView ? { width: `${score}%` } : { width: 0 }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {description ? (
        <p className="text-xs text-ink-500 dark:text-ink-400">{description}</p>
      ) : null}
    </div>
  );
}

export interface CircularMeterProps {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

export function CircularMeter({
  score,
  label = "Overall",
  size = 128,
  className,
}: CircularMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label} score ${score} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-100 dark:stroke-white/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#meter-gradient)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={
            inView
              ? { strokeDashoffset: circumference * (1 - score / 100) }
              : { strokeDashoffset: circumference }
          }
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="meter-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff8733" />
            <stop offset="100%" stopColor="#e05c00" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold tabular-nums">{score}</span>
        <span className="text-[11px] uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {label}
        </span>
      </div>
    </div>
  );
}

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
          "dark:border-white/15 dark:bg-ink-950/60",
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

export function SoftwareCard({
  software,
  status,
  className,
}: {
  software: Software;
  status: CompatibilityStatus;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface flex items-center gap-4 p-4 hover:border-brand-500/40",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-xl dark:bg-ink-950/60"
      >
        {software.icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{software.name}</h3>
        <p className="truncate text-xs text-ink-500 dark:text-ink-400">
          {software.vendor} · {software.category}
        </p>
      </div>
      <Badge tone={compatibilityTone(status)} className="shrink-0">
        {status}
      </Badge>
    </motion.article>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative inline-flex size-10 items-center justify-center overflow-hidden rounded-xl border transition",
        "border-ink-200 text-ink-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700",
        "dark:border-white/15 dark:text-ink-200 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10 dark:hover:text-brand-300",
        className,
      )}
    >
      {/* Before mount the stored preference is unknown, so render a stable
          icon and let the swap happen once hydration settles. */}
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <Sun className="size-[18px]" aria-hidden />
            ) : (
              <Moon className="size-[18px]" aria-hidden />
            )}
          </motion.span>
        </AnimatePresence>
      ) : (
        <Moon className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
